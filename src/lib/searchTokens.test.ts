import { describe, expect, it } from 'vitest';

import { buildSearchTokens, isbnToken, tokenizeQuery } from '@/lib/searchTokens';

describe('search tokens', () => {
  const tokens = buildSearchTokens({
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '978-0307474728',
  });

  it('indexes every prefix of title and author words without accents', () => {
    expect(tokens).toEqual(expect.arrayContaining(['ci', 'cien', 'anos', 'garc', 'garcia', 'marquez']));
    expect(tokens).not.toContain('garcía');
  });

  it('indexes the isbn digits', () => {
    expect(tokens).toContain('9780307474728');
    expect(isbnToken('978-0307474728')).toBe('9780307474728');
    expect(isbnToken('garcia')).toBeNull();
  });

  it('splits a query into normalized words', () => {
    expect(tokenizeQuery('  García,  MÁRQUEZ ')).toEqual(['garcia', 'marquez']);
  });
});
