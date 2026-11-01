import { COLLECTIONS } from '../src/constants/firestore.js';
import { adminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { generateText } from './_lib/gemini.js';
import { jsonResponse, readJson } from './_lib/http.js';
import { isRateLimited } from './_lib/rateLimit.js';
import {
  buildCatalogPrompt,
  CatalogEntry,
  parseRecommendations,
  RECOMMENDATION_INSTRUCTION,
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
} from './_lib/recommendations.js';

const CATALOG_CACHE_MS = 5 * 60 * 1000;

export const RECOMMENDATION_ERRORS = {
  unauthorized: 'Iniciá sesión para pedir recomendaciones.',
  invalidRequest: `Contanos qué querés leer en ${REQUEST_MIN_LENGTH} a ${REQUEST_MAX_LENGTH} caracteres.`,
  rateLimited: 'Hiciste muchas consultas seguidas. Esperá un minuto e intentá de nuevo.',
  notConfigured: 'Las recomendaciones no están disponibles en este entorno.',
  unavailable: 'El asistente no está disponible en este momento. Probá de nuevo en unos minutos.',
};

let catalogCache: { entries: CatalogEntry[]; loadedAt: number } | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.loadedAt < CATALOG_CACHE_MS) return catalogCache.entries;
  const snapshot = await adminDb()
    .collection(COLLECTIONS.books)
    .where('status', '==', 'published')
    .select('title', 'author', 'genre', 'language', 'condition')
    .get();
  const entries = snapshot.docs.map(bookDoc => ({
    id: bookDoc.id,
    title: String(bookDoc.get('title') ?? ''),
    author: String(bookDoc.get('author') ?? ''),
    genre: String(bookDoc.get('genre') ?? ''),
    language: String(bookDoc.get('language') ?? ''),
    condition: String(bookDoc.get('condition') ?? ''),
  }));
  catalogCache = { entries, loadedAt: Date.now() };
  return entries;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonResponse({ error: RECOMMENDATION_ERRORS.notConfigured }, 503);

  const userId = await verifyRequestUser(request);
  if (!userId) return jsonResponse({ error: RECOMMENDATION_ERRORS.unauthorized }, 401);
  if (isRateLimited(userId)) return jsonResponse({ error: RECOMMENDATION_ERRORS.rateLimited }, 429);

  const { request: readerRequest } = await readJson(request);
  const text = typeof readerRequest === 'string' ? readerRequest.trim() : '';
  if (text.length < REQUEST_MIN_LENGTH || text.length > REQUEST_MAX_LENGTH) {
    return jsonResponse({ error: RECOMMENDATION_ERRORS.invalidRequest }, 400);
  }

  try {
    const catalog = await loadCatalog();
    const answer = await generateText(apiKey, {
      contents: buildCatalogPrompt(text, catalog),
      systemInstruction: RECOMMENDATION_INSTRUCTION,
      json: true,
    });
    if (!answer) return jsonResponse({ error: RECOMMENDATION_ERRORS.unavailable }, 502);
    const recommendations = parseRecommendations(answer, new Set(catalog.map(entry => entry.id)));
    return jsonResponse({ recommendations });
  } catch (error) {
    console.error('Recommendations failed', error);
    return jsonResponse({ error: RECOMMENDATION_ERRORS.unavailable }, 502);
  }
}
