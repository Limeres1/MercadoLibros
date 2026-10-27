import { adminDb } from '../_lib/firebaseAdmin.js';
import { getPayment, isMercadoPagoEnabled } from '../_lib/mercadoPago.js';
import { applyPaymentOutcome, outcomeFromStatus } from '../_lib/orders.js';

async function handle(request: Request): Promise<Response> {
  if (!isMercadoPagoEnabled()) return new Response('OK');
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const topic = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const paymentId = body.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');
  if (topic !== 'payment' || !paymentId) return new Response('OK');

  try {
    const payment = await getPayment(String(paymentId));
    if (payment.external_reference) {
      await applyPaymentOutcome(
        adminDb(),
        payment.external_reference,
        outcomeFromStatus(payment.status),
        String(payment.id),
      );
    }
    return new Response('OK');
  } catch (error) {
    console.error('Webhook failed', error);
    return new Response('Error', { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
