import { describe, expect, it } from 'vitest';

import { paginateReaderText, READER_PAGE_LENGTH, readingProgress, rescalePage } from '@/lib/readerPagination';

const compact = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('shared reader pagination', () => {
  it('keeps every paragraph, including Windows line endings', () => {
    expect(paginateReaderText(' Uno.\r\n\r\nDos.\n\n\nTres. ')).toEqual(['Uno.\n\nDos.\n\nTres.']);
    expect(paginateReaderText(' \n ')).toEqual([]);
  });

  it('fills pages with many short verses instead of two lines per page', () => {
    const poem = Array.from(
      { length: 600 },
      (_line, index) => `Verso número ${index + 1} del poema, con su rima.`,
    ).join('\n\n');
    const pages = paginateReaderText(poem);
    expect(pages.length).toBeLessThan(70);
    expect(pages.every(page => page.length <= READER_PAGE_LENGTH)).toBe(true);
    expect(compact(pages.join(' '))).toBe(compact(poem));
  });

  it('splits a very long paragraph at sentence ends without losing text', () => {
    const paragraph = Array.from(
      { length: 80 },
      (_sentence, index) => `Esta es la oración ${index} del capítulo.`,
    ).join(' ');
    const pages = paginateReaderText(`Título\n\n${paragraph}\n\nFin.`);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every(page => page.length <= READER_PAGE_LENGTH)).toBe(true);
    expect(pages.slice(1, -1).every(page => page.trimEnd().endsWith('.'))).toBe(true);
    expect(compact(pages.join(' '))).toBe(compact(`Título ${paragraph} Fin.`));
  });

  it('splits a paragraph with no punctuation at word boundaries', () => {
    const words = Array.from({ length: 700 }, (_word, index) => `palabra${index}`).join(' ');
    const pages = paginateReaderText(words);
    expect(pages.length).toBeGreaterThan(3);
    expect(pages.every(page => page.length <= READER_PAGE_LENGTH)).toBe(true);
    expect(pages.join(' ')).toBe(words);
  });

  it('rescales a page position proportionally and keeps it in range', () => {
    expect(rescalePage(10, 20, 8)).toBe(4);
    expect(rescalePage(20, 20, 8)).toBe(8);
    expect(rescalePage(1, 579, 90)).toBe(1);
    expect(rescalePage(0, 20, 8)).toBe(0);
    expect(rescalePage(7, 8, 8)).toBe(7);
    expect(rescalePage(12, 8, 8)).toBe(8);
  });

  it('reports the same bounded current-page percentage for both screens', () => {
    expect(readingProgress(2, 3)).toEqual({ current: 2, total: 3, percent: 67 });
    expect(readingProgress(3, 3).percent).toBe(100);
    expect(readingProgress(200, 3).current).toBe(3);
    expect(readingProgress(0, 3).current).toBe(1);
    expect(readingProgress(NaN, 0)).toEqual({ current: 1, total: 1, percent: 100 });
  });
});
