import { Book } from '@/types';

export interface BookRecommendation {
  book: Book;
  reason: string;
}

const MAX_RECOMMENDATION_PROMPT_LENGTH = 5000;
const CATALOG_FORMAT = '[id, título, autor, género, idioma, formato, precio, descripción]';

export function buildRecommendationPrompt(request: string, books: Book[]): string {
  const requestText = request.trim();
  const candidates = books
    .filter(book => book.status === 'published')
    .map(book => {
      const entry = [
        book.id.slice(0, 100),
        book.title.slice(0, 100),
        book.author.slice(0, 80),
        book.genre.slice(0, 50),
        book.language.slice(0, 40),
        book.condition,
        book.price,
        book.description.slice(0, 160),
      ];
      return { book, entry, serialized: JSON.stringify(entry) };
    });

  const createPrompt = (catalog: unknown[]) =>
    JSON.stringify({ request: requestText, catalogFormat: CATALOG_FORMAT, catalog });
  const fullPrompt = createPrompt(candidates.map(candidate => candidate.entry));
  if (fullPrompt.length <= MAX_RECOMMENDATION_PROMPT_LENGTH) return fullPrompt;

  const terms = [
    ...new Set(
      requestText
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [],
    ),
  ].filter(term => term.length > 2);
  const rankedCandidates = candidates
    .map(candidate => {
      const fields = candidate.book;
      const searchableFields = [
        [fields.title, 5],
        [fields.author, 3],
        [fields.genre, 3],
        [fields.description, 2],
        [fields.language, 1],
        [fields.condition, 1],
        [String(fields.price), 1],
      ] as const;
      const score = terms.reduce(
        (total, term) =>
          total +
          searchableFields.reduce((fieldScore, [value, weight]) => {
            const normalized = value
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
            return fieldScore + (normalized.includes(term) ? weight : 0);
          }, 0),
        0,
      );
      return { ...candidate, score };
    })
    .sort((first, second) => second.score - first.score || first.book.title.localeCompare(second.book.title));

  const promptBaseLength = createPrompt([]).length;
  const catalog: unknown[] = [];
  let catalogLength = 0;
  for (const candidate of rankedCandidates) {
    const nextLength = catalogLength + candidate.serialized.length + (catalog.length > 0 ? 1 : 0);
    if (promptBaseLength + nextLength > MAX_RECOMMENDATION_PROMPT_LENGTH) continue;
    catalog.push(candidate.entry);
    catalogLength = nextLength;
  }
  return createPrompt(catalog);
}

export function parseBookRecommendations(text: string, publishedBooks: Book[]): BookRecommendation[] {
  const catalogById = new Map(publishedBooks.filter(book => book.status === 'published').map(book => [book.id, book]));
  const response: unknown = JSON.parse(text);
  if (!response || typeof response !== 'object' || !('recommendations' in response)) return [];

  const suggestions = (response as { recommendations: unknown }).recommendations;
  if (!Array.isArray(suggestions)) return [];

  const seen = new Set<string>();
  const recommendations: BookRecommendation[] = [];
  for (const suggestion of suggestions) {
    if (!suggestion || typeof suggestion !== 'object') continue;
    const { bookId, reason } = suggestion as { bookId?: unknown; reason?: unknown };
    if (typeof bookId !== 'string' || typeof reason !== 'string' || !reason.trim() || seen.has(bookId)) continue;
    const book = catalogById.get(bookId);
    if (!book) continue;
    seen.add(bookId);
    recommendations.push({ book, reason: reason.trim() });
    if (recommendations.length === 3) break;
  }
  return recommendations;
}
