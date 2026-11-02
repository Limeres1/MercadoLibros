import { normalizeText } from '@/lib/format';

export function matchesSearch(search: string, fields: (string | undefined)[]) {
  const words = normalizeText(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(' '));
  return words.every(word => haystack.includes(word));
}
