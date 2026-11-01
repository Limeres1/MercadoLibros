import { describe, expect, it } from 'vitest';

import { isbnSearchVariants, normalizeIsbn } from '@/lib/isbn';

describe('ISBN validation', () => {
  it.each([
    [' 978-0 307-47472-8 ', '9780307474728'],
    ['0-307-47472-0', '0307474720'],
    ['0-8044-2957-X', '080442957x'],
    ['9791090636071', '9791090636071'],
  ])('accepts and normalizes %s', (input, normalized) => {
    expect(normalizeIsbn(input)).toBe(normalized);
  });

  it.each([
    '',
    '   ',
    '123',
    '9780307474729',
    '0307474721',
    '978030747472X',
    '4006381333931',
    '0000000000',
    'https://example.com/9780307474728',
    '978/0307474728',
  ])('rejects invalid input %s', input => {
    expect(normalizeIsbn(input)).toBeNull();
  });

  it('searches equivalent ISBN-10 and ISBN-13 editions in either direction', () => {
    expect(isbnSearchVariants('0307474720')).toEqual(['0307474720', '9780307474728']);
    expect(isbnSearchVariants('9780307474728')).toEqual(['9780307474728', '0307474720']);
    expect(isbnSearchVariants('080442957x')).toEqual(['080442957x', '9780804429573']);
    expect(isbnSearchVariants('9780804429573')).toEqual(['9780804429573', '080442957x']);
  });

  it('does not invent an ISBN-10 equivalent for the 979 prefix', () => {
    expect(isbnSearchVariants('9791090636071')).toEqual(['9791090636071']);
  });
});
