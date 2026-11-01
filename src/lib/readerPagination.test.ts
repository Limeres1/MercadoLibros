import { describe, expect, it } from 'vitest';

import { paginateReaderText, readingProgress } from '@/lib/readerPagination';

describe('shared reader pagination', () => {
  it('keeps every paragraph, including an odd final paragraph and Windows line endings', () => {
    expect(paginateReaderText(' Uno.\r\n\r\nDos.\n\n\nTres. ')).toEqual(['Uno.\n\nDos.', 'Tres.']);
    expect(paginateReaderText(' \n ')).toEqual([]);
  });

  it('reports the same bounded current-page percentage for both screens', () => {
    expect(readingProgress(2, 3)).toEqual({ current: 2, total: 3, percent: 67 });
    expect(readingProgress(3, 3).percent).toBe(100);
    expect(readingProgress(200, 3).current).toBe(3);
    expect(readingProgress(0, 3).current).toBe(1);
    expect(readingProgress(NaN, 0)).toEqual({ current: 1, total: 1, percent: 100 });
  });
});
