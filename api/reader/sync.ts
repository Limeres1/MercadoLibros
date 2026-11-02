import { adminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { jsonResponse, readJson } from '../_lib/http.js';
import { ReaderError, synchronizeReaderPages } from '../_lib/reader.js';

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await verifyRequestUser(request);
    if (!userId) return jsonResponse({ error: 'Iniciá sesión para leer.' }, 401);
    const { bookId } = await readJson(request);
    if (typeof bookId !== 'string' || !bookId || bookId.length > 1500 || bookId.includes('/')) {
      return jsonResponse({ error: 'El libro no es válido.' }, 400);
    }
    return jsonResponse(await synchronizeReaderPages(adminDb(), userId, bookId));
  } catch (error) {
    if (error instanceof ReaderError) return jsonResponse({ error: error.message }, error.status);
    console.error('Reader page sync failed', error);
    return jsonResponse({ error: 'No pudimos sincronizar las páginas. Intentá de nuevo.' }, 503);
  }
}
