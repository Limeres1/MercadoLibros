import { normalizeText } from '@/lib/format';

const MIN_TOKEN_LENGTH = 2;

export const tokenizeQuery = (text: string) =>
  normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= MIN_TOKEN_LENGTH);

export const isbnToken = (text: string) => {
  const digits = text.replace(/[-\s]/g, '').toLowerCase();
  return /^\d{9}[\dx](\d{3})?$/.test(digits) ? digits : null;
};

export function buildSearchTokens(book: { title: string; author: string; isbn?: string }) {
  const tokens = new Set<string>();
  for (const word of tokenizeQuery(`${book.title} ${book.author}`)) {
    for (let length = MIN_TOKEN_LENGTH; length <= word.length; length++) tokens.add(word.slice(0, length));
  }
  const isbn = isbnToken(book.isbn ?? '');
  if (isbn) tokens.add(isbn);
  return [...tokens];
}
