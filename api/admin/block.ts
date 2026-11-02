import { adminAuth, adminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { jsonResponse, readJson } from '../_lib/http.js';
import { BLOCK_ERRORS, BlockError, parseBlockRequest, setUserBlocked } from '../_lib/userBlocking.js';

export async function POST(request: Request): Promise<Response> {
  const adminId = await verifyRequestUser(request);
  if (!adminId) return jsonResponse({ error: BLOCK_ERRORS.unauthorized }, 401);
  const body = parseBlockRequest(await readJson(request));
  if (!body) return jsonResponse({ error: BLOCK_ERRORS.invalidRequest }, 400);
  try {
    await setUserBlocked(adminDb(), adminAuth(), adminId, body);
    return jsonResponse({ blocked: body.blocked });
  } catch (error) {
    if (error instanceof BlockError) return jsonResponse({ error: error.message }, error.status);
    console.error('User block failed', error);
    return jsonResponse({ error: BLOCK_ERRORS.unavailable }, 503);
  }
}
