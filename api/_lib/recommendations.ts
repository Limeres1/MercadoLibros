export const MAX_RECOMMENDATIONS = 3;
export const REQUEST_MIN_LENGTH = 3;
export const REQUEST_MAX_LENGTH = 500;

export interface CatalogEntry {
  id: string;
  title: string;
  author: string;
  genre: string;
  language: string;
  condition: string;
}

export interface Recommendation {
  bookId: string;
  reason: string;
}

export const RECOMMENDATION_INSTRUCTION = [
  'Sos un librero de Mercado Libros que recomienda con calidez y brevedad.',
  'Recibís el pedido del lector y el catálogo completo, una línea por libro: id | título | autor | género | idioma | formato.',
  `Elegí como máximo ${MAX_RECOMMENDATIONS} libros del catálogo que mejor respondan al pedido y explicá en una frase en español por qué encaja cada uno.`,
  'Usá exclusivamente ids que aparezcan en el catálogo; nunca inventes libros ni ids.',
  'Respondé sólo JSON con la forma {"recommendations":[{"bookId":"id","reason":"motivo"}]}. Si ninguno encaja, devolvé {"recommendations":[]}.',
].join(' ');

const clean = (value: string) => value.replace(/[|\n\r]+/g, ' ').trim();

export function buildCatalogPrompt(request: string, catalog: CatalogEntry[]) {
  const lines = catalog.map(entry =>
    [entry.id, entry.title, entry.author, entry.genre, entry.language, entry.condition].map(clean).join(' | '),
  );
  return `Pedido del lector: ${clean(request)}\n\nCatálogo:\n${lines.join('\n')}`;
}

export function parseRecommendations(text: string, validIds: Set<string>): Recommendation[] {
  let response: unknown;
  try {
    response = JSON.parse(text);
  } catch {
    return [];
  }
  const suggestions = (response as { recommendations?: unknown } | null)?.recommendations;
  if (!Array.isArray(suggestions)) return [];

  const seen = new Set<string>();
  const recommendations: Recommendation[] = [];
  for (const suggestion of suggestions) {
    const { bookId, reason } = (suggestion ?? {}) as { bookId?: unknown; reason?: unknown };
    if (typeof bookId !== 'string' || typeof reason !== 'string' || !reason.trim()) continue;
    if (!validIds.has(bookId) || seen.has(bookId)) continue;
    seen.add(bookId);
    recommendations.push({ bookId, reason: reason.trim().slice(0, 300) });
    if (recommendations.length === MAX_RECOMMENDATIONS) break;
  }
  return recommendations;
}
