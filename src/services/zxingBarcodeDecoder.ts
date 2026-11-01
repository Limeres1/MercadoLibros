import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, ChecksumException, DecodeHintType, FormatException, NotFoundException } from '@zxing/library';

import { BarcodeDecoder } from '@/services/barcodeDecoder';

export function createZxingBarcodeDecoder(): BarcodeDecoder {
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
  const reader = new BrowserMultiFormatReader(hints);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable');
  let disposed = false;
  return {
    async detect(source) {
      if (disposed) return null;
      const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      if (!width || !height) return null;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(source, 0, 0, width, height);
      try {
        return reader.decodeFromCanvas(canvas).getText();
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof ChecksumException ||
          error instanceof FormatException
        )
          return null;
        throw error;
      }
    },
    dispose() {
      disposed = true;
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
