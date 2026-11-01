import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBarcodeDecoder } from '@/services/barcodeDecoder';

const fallback = vi.hoisted(() => ({ create: vi.fn(), detect: vi.fn(), dispose: vi.fn() }));
vi.mock('@/services/zxingBarcodeDecoder', () => ({ createZxingBarcodeDecoder: () => fallback.create() }));
const frame = () => document.createElement('canvas');

beforeEach(() => {
  fallback.detect.mockReset().mockResolvedValue('9780307474728');
  fallback.dispose.mockClear();
  fallback.create.mockReset().mockReturnValue({ detect: fallback.detect, dispose: fallback.dispose });
  vi.stubGlobal('BarcodeDetector', undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('ISBN barcode decoder selection', () => {
  it('uses ZXing when the browser has no BarcodeDetector', async () => {
    const decoder = await createBarcodeDecoder();
    expect(await decoder.detect(frame())).toBe('9780307474728');
    expect(fallback.create).toHaveBeenCalledTimes(1);
    decoder.dispose();
    await Promise.resolve();
    expect(fallback.dispose).toHaveBeenCalled();
    expect(await decoder.detect(frame())).toBeNull();
  });

  it('uses the native EAN-13 decoder without loading ZXing when it works', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: '4006381333931' }, { rawValue: '9780307474728' }]);
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = async () => ['ean_13'];
        detect = detect;
      },
    );
    const decoder = await createBarcodeDecoder();
    expect(await decoder.detect(frame())).toBe('9780307474728');
    expect(fallback.create).not.toHaveBeenCalled();
  });

  it.each(['formats', 'constructor', 'detection'])(
    'falls back when native %s is unsupported or fails',
    async failure => {
      const detect = vi.fn().mockRejectedValue(new Error('Unsupported native decoder'));
      vi.stubGlobal(
        'BarcodeDetector',
        class {
          static getSupportedFormats = async () => (failure === 'formats' ? ['qr_code'] : ['ean_13']);
          constructor() {
            if (failure === 'constructor') throw new Error('Unavailable');
          }
          detect = detect;
        },
      );
      const decoder = await createBarcodeDecoder();
      expect(await decoder.detect(frame())).toBe('9780307474728');
      expect(await decoder.detect(frame())).toBe('9780307474728');
      expect(fallback.create).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['4006381333931', '12345678', 'https://example.com', null])('ignores non-book barcodes (%s)', async code => {
    fallback.detect.mockResolvedValue(code);
    const decoder = await createBarcodeDecoder();
    expect(await decoder.detect(frame())).toBeNull();
  });

  it('ignores a fallback result delivered after disposal', async () => {
    let resolve!: (code: string) => void;
    fallback.detect.mockReturnValue(
      new Promise<string>(done => {
        resolve = done;
      }),
    );
    const decoder = await createBarcodeDecoder();
    const result = decoder.detect(frame());
    await Promise.resolve();
    decoder.dispose();
    resolve('9780307474728');
    expect(await result).toBeNull();
  });
});
