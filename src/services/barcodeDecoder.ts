export interface BarcodeDecoder {
  detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<string | null>;
  dispose: () => void;
}

interface NativeDetectorConstructor {
  new (options: { formats: string[] }): { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  getSupportedFormats?: () => Promise<string[]>;
}

const isbnBarcode = (code: string | null) => (code && /^97[89]\d{10}$/.test(code) ? code : null);

export async function createBarcodeDecoder(): Promise<BarcodeDecoder> {
  let disposed = false;
  let native: InstanceType<NativeDetectorConstructor> | null = null;
  let fallback: Promise<BarcodeDecoder> | null = null;
  const loadFallback = () =>
    (fallback ??= import('@/services/zxingBarcodeDecoder').then(module => module.createZxingBarcodeDecoder()));
  const Detector = (window as unknown as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
  try {
    if (Detector && (!Detector.getSupportedFormats || (await Detector.getSupportedFormats()).includes('ean_13'))) {
      native = new Detector({ formats: ['ean_13'] });
    }
  } catch {
    native = null;
  }
  if (!native) await loadFallback();

  return {
    async detect(source) {
      if (disposed) return null;
      if (native) {
        try {
          const codes = await native.detect(source);
          return disposed ? null : (codes.map(code => isbnBarcode(code.rawValue)).find(Boolean) ?? null);
        } catch {
          native = null;
        }
      }
      const decoder = await loadFallback();
      if (disposed) {
        decoder.dispose();
        return null;
      }
      const code = await decoder.detect(source);
      return disposed ? null : isbnBarcode(code);
    },
    dispose() {
      disposed = true;
      fallback?.then(decoder => decoder.dispose()).catch(() => undefined);
    },
  };
}
