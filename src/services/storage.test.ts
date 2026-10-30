import { describe, expect, it } from 'vitest';

import { ASSET_CONSTRAINTS, validateAssetFile } from '@/services/storage';

function createFile(name: string, sizeBytes: number, mimeType: string): File {
  const blob = new Blob(['x'.repeat(Math.min(sizeBytes, 1024))], { type: mimeType });
  const file = new File([blob], name, { type: mimeType });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('Storage Asset Validations (CA-1)', () => {
  describe('Portada (cover)', () => {
    it('accepts JPG, PNG, and WebP images within 5 MB', () => {
      const jpg = createFile('cover.jpg', 2 * 1024 * 1024, 'image/jpeg');
      const png = createFile('cover.png', 4 * 1024 * 1024, 'image/png');
      const webp = createFile('cover.webp', 1 * 1024 * 1024, 'image/webp');

      expect(validateAssetFile(jpg, 'cover')).toEqual({ valid: true });
      expect(validateAssetFile(png, 'cover')).toEqual({ valid: true });
      expect(validateAssetFile(webp, 'cover')).toEqual({ valid: true });
    });

    it('rejects unsupported file formats with a clear message', () => {
      const pdf = createFile('cover.pdf', 1024, 'application/pdf');
      const gif = createFile('cover.gif', 1024, 'image/gif');

      expect(validateAssetFile(pdf, 'cover')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.cover.formatError,
      });
      expect(validateAssetFile(gif, 'cover')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.cover.formatError,
      });
    });

    it('rejects files exceeding 5 MB with a clear message', () => {
      const bigJpg = createFile('cover.jpg', 6 * 1024 * 1024, 'image/jpeg');

      expect(validateAssetFile(bigJpg, 'cover')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.cover.sizeError,
      });
    });
  });

  describe('Archivo del libro (bookFile)', () => {
    it('accepts PDF, EPUB, and TXT files within 20 MB', () => {
      const pdf = createFile('book.pdf', 15 * 1024 * 1024, 'application/pdf');
      const epub = createFile('book.epub', 10 * 1024 * 1024, 'application/epub+zip');
      const txt = createFile('book.txt', 1024, 'text/plain');

      expect(validateAssetFile(pdf, 'bookFile')).toEqual({ valid: true });
      expect(validateAssetFile(epub, 'bookFile')).toEqual({ valid: true });
      expect(validateAssetFile(txt, 'bookFile')).toEqual({ valid: true });
    });

    it('rejects unsupported file formats with a clear message', () => {
      const exe = createFile('book.exe', 1024, 'application/octet-stream');
      const docx = createFile(
        'book.docx',
        1024,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      expect(validateAssetFile(exe, 'bookFile')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.bookFile.formatError,
      });
      expect(validateAssetFile(docx, 'bookFile')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.bookFile.formatError,
      });
    });

    it('rejects files exceeding 20 MB with a clear message', () => {
      const bigPdf = createFile('book.pdf', 25 * 1024 * 1024, 'application/pdf');

      expect(validateAssetFile(bigPdf, 'bookFile')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.bookFile.sizeError,
      });
    });
  });

  describe('Muestra gratuita (sampleFile)', () => {
    it('accepts PDF, EPUB, and TXT files within 10 MB', () => {
      const pdf = createFile('sample.pdf', 5 * 1024 * 1024, 'application/pdf');

      expect(validateAssetFile(pdf, 'sampleFile')).toEqual({ valid: true });
    });

    it('rejects sample files exceeding 10 MB with a clear message', () => {
      const bigSample = createFile('sample.pdf', 11 * 1024 * 1024, 'application/pdf');

      expect(validateAssetFile(bigSample, 'sampleFile')).toEqual({
        valid: false,
        error: ASSET_CONSTRAINTS.sampleFile.sizeError,
      });
    });
  });
});
