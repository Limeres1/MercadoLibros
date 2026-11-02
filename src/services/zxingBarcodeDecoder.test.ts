import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBarcodeDecoder } from '@/services/barcodeDecoder';

const isbn = '9780307474728';
const leftPatterns = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const alternatePatterns = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const parity = 'LGGLGL';
const left = [...isbn.slice(1, 7)]
  .map((digit, index) => (parity[index] === 'L' ? leftPatterns : alternatePatterns)[Number(digit)])
  .join('');
const right = [...isbn.slice(7)]
  .map(digit => [...leftPatterns[Number(digit)]].map(bit => (bit === '0' ? '1' : '0')).join(''))
  .join('');
const bars = `00000000000101${left}01010${right}10100000000000`;
const width = bars.length * 3;
const height = 100;

function barcodePixels(blank = false) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  if (!blank) {
    for (let row = 10; row < 90; row++) {
      for (let column = 0; column < width; column++) {
        if (bars[Math.floor(column / 3)] === '1')
          pixels.fill(0, (row * width + column) * 4, (row * width + column) * 4 + 3);
      }
    }
  }
  return pixels;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('real ZXing fallback', () => {
  it('decodes EAN-13 ISBN pixels without native BarcodeDetector and releases its canvas', async () => {
    vi.stubGlobal('BarcodeDetector', undefined);
    const drawImage = vi.fn();
    let data = barcodePixels();
    const getImageData = vi.fn(() => ({ data, width, height }));
    const context = { drawImage, getImageData } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const decoder = await createBarcodeDecoder();
    expect(await decoder.detect(source)).toBe(isbn);
    data = barcodePixels(true);
    expect(await decoder.detect(source)).toBeNull();
    decoder.dispose();
    await Promise.resolve();
    expect(await decoder.detect(source)).toBeNull();
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});
