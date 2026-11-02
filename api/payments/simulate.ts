import { COLLECTIONS } from '../../src/constants/firestore.js';
import { adminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { jsonResponse, PAYMENT_ERRORS, readJson } from '../_lib/http.js';
import { isMercadoPagoEnabled } from '../_lib/mercadoPago.js';
import { applyPaymentOutcome, newSimulatedPaymentId } from '../_lib/orders.js';

export async function POST(request: Request): Promise<Response> {
  if (isMercadoPagoEnabled()) return jsonResponse({ error: PAYMENT_ERRORS.simulationDisabled }, 403);
  const userId = await verifyRequestUser(request);
  if (!userId) return jsonResponse({ error: PAYMENT_ERRORS.unauthorized }, 401);
  const { orderId, outcome } = await readJson(request);
  if (typeof orderId !== 'string' || (outcome !== 'approved' && outcome !== 'rejected')) {
    return jsonResponse({ error: PAYMENT_ERRORS.invalidRequest }, 400);
  }

  const db = adminDb();
  const order = (await db.collection(COLLECTIONS.orders).doc(orderId).get()).data();
  if (!order || order.buyerId !== userId) return jsonResponse({ error: PAYMENT_ERRORS.notFound }, 404);
  const status = await applyPaymentOutcome(db, orderId, outcome, newSimulatedPaymentId());
  return jsonResponse({ status });
}
