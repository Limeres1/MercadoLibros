import { COLLECTIONS } from '../src/constants/firestore.js';
import { isPaymentOption, PAYMENT_OPTIONS } from '../src/constants/payments.js';
import { ORDER_PARAM, ROUTES } from '../src/constants/routes.js';
import { adminDb, verifyRequestUser } from './_lib/firebaseAdmin.js';
import { jsonResponse, PAYMENT_ERRORS, readJson } from './_lib/http.js';
import { createPreference, isMercadoPagoEnabled } from './_lib/mercadoPago.js';
import { CheckoutError, createOrderFromCart } from './_lib/orders.js';

export async function POST(request: Request): Promise<Response> {
  const userId = await verifyRequestUser(request);
  if (!userId) return jsonResponse({ error: PAYMENT_ERRORS.unauthorized }, 401);

  const body = await readJson(request);
  const shippingAddress = typeof body.shippingAddress === 'string' ? body.shippingAddress : '';
  if (!isPaymentOption(body.paymentOption)) return jsonResponse({ error: PAYMENT_ERRORS.invalidRequest }, 400);
  const paymentOption = PAYMENT_OPTIONS[body.paymentOption];
  const location = body.shippingLocation as { lat?: unknown; lng?: unknown } | null;
  const shippingLocation =
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    Math.abs(location.lat) <= 90 &&
    Math.abs(location.lng) <= 180
      ? { lat: location.lat, lng: location.lng }
      : null;
  const origin = new URL(request.url).origin;
  const useMercadoPago = isMercadoPagoEnabled();
  const db = adminDb();

  try {
    const order = await createOrderFromCart(
      db,
      userId,
      shippingAddress,
      `${useMercadoPago ? 'Mercado Pago' : 'Pago de prueba'} · ${paymentOption.label}`,
      shippingLocation,
    );
    if (!useMercadoPago) {
      const checkoutUrl = `${ROUTES.paymentSimulation}?${new URLSearchParams({ [ORDER_PARAM]: order.id })}`;
      await db.collection(COLLECTIONS.orders).doc(order.id).update({ checkoutUrl });
      return jsonResponse({ orderId: order.id, checkoutUrl });
    }
    const { preferenceId, checkoutUrl } = await createPreference(
      order.id,
      order.items.map(item => ({
        id: item.bookId,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      origin,
      paymentOption.excludedTypes,
    ).catch(error => {
      console.error('Mercado Pago preference failed', error);
      throw new CheckoutError(PAYMENT_ERRORS.paymentProvider);
    });
    await db.collection(COLLECTIONS.orders).doc(order.id).update({ preferenceId, checkoutUrl });
    return jsonResponse({ orderId: order.id, checkoutUrl });
  } catch (error) {
    if (error instanceof CheckoutError) return jsonResponse({ error: error.message }, 400);
    console.error('Checkout failed', error);
    return jsonResponse({ error: PAYMENT_ERRORS.paymentProvider }, 500);
  }
}
