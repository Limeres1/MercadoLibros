import { API_ROUTES } from '../../src/constants/api.js';
import { ORDER_PARAM, ROUTES } from '../../src/constants/routes.js';

const API = 'https://api.mercadopago.com';

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  payment_type_id?: string;
}

export interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export const isMercadoPagoEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Mercado Pago ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function createPreference(
  orderId: string,
  items: PreferenceItem[],
  origin: string,
  excludedPaymentTypes: readonly string[],
) {
  const isPublicUrl = origin.startsWith('https://');
  const returnUrl = `${origin}${ROUTES.orders}?${new URLSearchParams({ [ORDER_PARAM]: orderId })}`;
  const preference = await request<{ id: string; init_point: string; sandbox_init_point?: string }>(
    '/checkout/preferences',
    {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(item => ({ ...item, currency_id: process.env.MP_CURRENCY || 'ARS' })),
        external_reference: orderId,
        payment_methods: { excluded_payment_types: excludedPaymentTypes.map(id => ({ id })) },
        back_urls: { success: returnUrl, failure: returnUrl, pending: returnUrl },
        ...(isPublicUrl ? { auto_return: 'approved', notification_url: `${origin}${API_ROUTES.paymentWebhook}` } : {}),
      }),
    },
  );
  return { preferenceId: preference.id, checkoutUrl: preference.sandbox_init_point ?? preference.init_point };
}

export const getPayment = (paymentId: string) =>
  request<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);

export async function findLatestPayment(orderId: string) {
  const params = new URLSearchParams({ external_reference: orderId, sort: 'date_created', criteria: 'desc' });
  const result = await request<{ results: MercadoPagoPayment[] }>(`/v1/payments/search?${params}`);
  return result.results[0] ?? null;
}
