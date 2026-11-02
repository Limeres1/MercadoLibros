import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST, SELLER_SALES_ERRORS } from '@api/seller/sales';

const fake = vi.hoisted(() => ({
  userId: 'seller-1' as string | null,
  docs: [] as object[],
  where: vi.fn(),
  failing: false,
}));

vi.mock('@api/_lib/firebaseAdmin', () => ({
  verifyRequestUser: async () => fake.userId,
  adminDb: () => ({
    collection: () => ({
      where: (...args: unknown[]) => {
        fake.where(...args);
        return {
          get: async () => {
            if (fake.failing) throw new Error('firestore down');
            return { docs: fake.docs.map(data => ({ id: (data as { id: string }).id, data: () => data })) };
          },
        };
      },
    }),
  }),
}));

const line = (sellerId: string, title: string, price: number, quantity = 1) => ({
  bookId: title,
  sellerId,
  title,
  author: 'A',
  price,
  quantity,
  coverUrl: '',
  condition: 'nuevo',
});

const request = () => new Request('http://localhost/api/seller/sales', { method: 'POST', body: '{}' });

describe('api/seller/sales', () => {
  beforeEach(() => {
    fake.userId = 'seller-1';
    fake.failing = false;
    fake.docs = [
      {
        id: 'ord_mixed',
        status: 'paid',
        paidAt: '2026-10-02T10:00:00.000Z',
        buyerName: 'Renata',
        buyerEmail: 'renata@test.com',
        shippingAddress: 'Calle 123',
        sellerIds: ['seller-1', 'seller-2'],
        items: [line('seller-1', 'Mío', 10, 2), line('seller-2', 'Ajeno', 99)],
      },
      {
        id: 'ord_pending',
        status: 'pending',
        buyerName: 'Renata',
        sellerIds: ['seller-1'],
        items: [line('seller-1', 'Sin pagar', 5)],
      },
      {
        id: 'ord_old',
        status: 'paid',
        paidAt: '2026-05-01T10:00:00.000Z',
        buyerName: 'Tomás',
        sellerIds: ['seller-1'],
        items: [line('seller-1', 'Viejo', 7)],
      },
    ];
  });

  afterEach(() => vi.clearAllMocks());

  it('CA-3: returns only the paid lines of the signed in seller, without other buyer data', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(fake.where).toHaveBeenCalledWith('sellerIds', 'array-contains', 'seller-1');
    const { sales } = await response.json();
    expect(sales).toEqual([
      {
        orderId: 'ord_mixed',
        paidAt: '2026-10-02T10:00:00.000Z',
        bookId: 'Mío',
        title: 'Mío',
        quantity: 2,
        price: 10,
        buyerName: 'Renata',
      },
      {
        orderId: 'ord_old',
        paidAt: '2026-05-01T10:00:00.000Z',
        bookId: 'Viejo',
        title: 'Viejo',
        quantity: 1,
        price: 7,
        buyerName: 'Tomás',
      },
    ]);
    expect(JSON.stringify(sales)).not.toMatch(/Ajeno|renata@test.com|Calle 123/);
  });

  it('rejects visitors and reports database errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.userId = null;
    expect((await POST(request())).status).toBe(401);
    expect(await (await POST(request())).json()).toEqual({ error: SELLER_SALES_ERRORS.unauthorized });

    fake.userId = 'seller-1';
    fake.failing = true;
    expect((await POST(request())).status).toBe(503);
  });
});
