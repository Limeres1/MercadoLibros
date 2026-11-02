import { COLLECTIONS } from '../../src/constants/firestore.js';
import { adminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { jsonResponse, PAYMENT_ERRORS, readJson } from '../_lib/http.js';
import { findLatestPayment, isMercadoPagoEnabled } from '../_lib/mercadoPago.js';
import { applyPaymentOutcome, outcomeFromStatus } from '../_lib/orders.js';

export async function POST(request: Request): Promise<Response> {
  const userId = await verifyRequestUser(request);
  if (!userId) return jsonResponse({ error: PAYMENT_ERRORS.unauthorized }, 401);
  const { orderId } = await readJson(request);
  if (typeof orderId !== 'string' || !orderId) return jsonResponse({ error: PAYMENT_ERRORS.invalidRequest }, 400);

  const db = adminDb();
  const order = (await db.collection(COLLECTIONS.orders).doc(orderId).get()).data();
  if (!order || order.buyerId !== userId) return jsonResponse({ error: PAYMENT_ERRORS.notFound }, 404);
  if (order.status !== 'pending' || !isMercadoPagoEnabled()) return jsonResponse({ status: order.status });

  try {
    const payment = await findLatestPayment(orderId);
    if (!payment) return jsonResponse({ status: 'pending' });
    const status = await applyPaymentOutcome(db, orderId, outcomeFromStatus(payment.status), String(payment.id));
    return jsonResponse({ status });
  } catch (error) {
    console.error('Payment sync failed', error);
    return jsonResponse({ error: PAYMENT_ERRORS.paymentProvider }, 502);
  }
}
