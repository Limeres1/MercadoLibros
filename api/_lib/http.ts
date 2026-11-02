export const jsonResponse = (body: object, status = 200) => Response.json(body, { status });

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

export const PAYMENT_ERRORS = {
  unauthorized: 'Iniciá sesión para comprar.',
  notConfigured: 'Los pagos no están configurados en este entorno.',
  invalidRequest: 'El pedido no es válido.',
  notFound: 'No encontramos el pedido.',
  emptyCart: 'Tu carrito está vacío.',
  addressRequired: 'Ingresá una dirección de envío válida para los libros impresos.',
  paymentProvider: 'No pudimos iniciar el pago con Mercado Pago. Intentá de nuevo en unos minutos.',
  simulationDisabled: 'El pago simulado no está disponible: este entorno usa Mercado Pago.',
};
