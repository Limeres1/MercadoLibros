import { adminDb, verifyRequestUser } from '../_lib/firebaseAdmin.js';
import { jsonResponse } from '../_lib/http.js';
import { loadSellerSales } from '../_lib/sellerSales.js';

export const SELLER_SALES_ERRORS = {
  unauthorized: 'Iniciá sesión para ver tus ventas.',
  unavailable: 'No pudimos cargar tus ventas. Intentá de nuevo en unos minutos.',
};

export async function POST(request: Request): Promise<Response> {
  const userId = await verifyRequestUser(request);
  if (!userId) return jsonResponse({ error: SELLER_SALES_ERRORS.unauthorized }, 401);
  try {
    return jsonResponse({ sales: await loadSellerSales(adminDb(), userId) });
  } catch (error) {
    console.error('Seller sales failed', error);
    return jsonResponse({ error: SELLER_SALES_ERRORS.unavailable }, 503);
  }
}
