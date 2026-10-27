import { deleteApp, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { applyPaymentOutcome, CheckoutError, createOrderFromCart } from '@api/_lib/orders';

const BUYER = 'buyer_1';
const DIGITAL = 'book_digital';
const PHYSICAL = 'book_fisico';
const ADDRESS = 'Av. Corrientes 1234, CABA';

const app = initializeApp({ projectId: 'demo-mercadolibros' }, 'orders-test');
let db: Firestore;

const book = (overrides: Record<string, unknown>) => ({
  title: 'Libro',
  author: 'Autora',
  price: 10,
  coverUrl: '',
  sellerId: 'seller_1',
  status: 'published',
  pages: 120,
  salesCount: 0,
  ...overrides,
});

const userRef = () => db.collection('users').doc(BUYER);
const cart = (items: Record<string, number>) =>
  Promise.all(
    Object.entries(items).map(([bookId, quantity]) =>
      userRef().collection('cart').doc(bookId).set({ quantity, addedAt: '2026-10-27T00:00:00.000Z' }),
    ),
  );

beforeAll(() => {
  db = getFirestore(app);
});

afterAll(() => deleteApp(app));

beforeEach(async () => {
  await db.recursiveDelete(db.collection('users'));
  await db.recursiveDelete(db.collection('books'));
  await db.recursiveDelete(db.collection('orders'));
  await userRef().set({ displayName: 'Lectora', email: 'lectora@test.com', role: 'buyer', isBlocked: false });
  await db
    .collection('books')
    .doc(DIGITAL)
    .set(book({ title: 'Digital', condition: 'digital', price: 3.5 }));
  await db
    .collection('books')
    .doc(PHYSICAL)
    .set(book({ title: 'Físico', condition: 'usado', stock: 2, price: 12 }));
});

describe('checkout', () => {
  it('creates a pending order from the cart with totals computed on the server', async () => {
    await cart({ [DIGITAL]: 1, [PHYSICAL]: 2 });
    const order = await createOrderFromCart(db, BUYER, ADDRESS, 'Mercado Pago');
    const saved = (await db.collection('orders').doc(order.id).get()).data();
    expect(saved).toMatchObject({
      status: 'pending',
      subtotal: 27.5,
      shippingCost: 4.5,
      totalAmount: 32,
      buyerId: BUYER,
    });
    expect(saved?.items).toHaveLength(2);
  });

  it('validates stock, address and books already owned', async () => {
    await cart({ [PHYSICAL]: 3 });
    await expect(createOrderFromCart(db, BUYER, ADDRESS, 'x')).rejects.toThrow('Sólo quedan 2 ejemplares');
    await cart({ [PHYSICAL]: 1 });
    await expect(createOrderFromCart(db, BUYER, '', 'x')).rejects.toBeInstanceOf(CheckoutError);
    await userRef().collection('cart').doc(PHYSICAL).delete();
    await cart({ [DIGITAL]: 1 });
    await userRef().collection('purchases').doc(DIGITAL).set({ orderId: 'old', purchasedAt: 'x' });
    await expect(createOrderFromCart(db, BUYER, '', 'x')).rejects.toThrow('Ya compraste');
  });

  it('rejects an empty cart and unpublished books', async () => {
    await expect(createOrderFromCart(db, BUYER, ADDRESS, 'x')).rejects.toThrow('vacío');
    await db.collection('books').doc(PHYSICAL).update({ status: 'withdrawn' });
    await cart({ [PHYSICAL]: 1 });
    await expect(createOrderFromCart(db, BUYER, ADDRESS, 'x')).rejects.toThrow('ya no está a la venta');
  });
});

describe('payment confirmation', () => {
  it('CA-1: an approved payment marks the order paid and delivers the books', async () => {
    await cart({ [DIGITAL]: 1, [PHYSICAL]: 2 });
    const { id } = await createOrderFromCart(db, BUYER, ADDRESS, 'Mercado Pago');
    expect(await applyPaymentOutcome(db, id, 'approved', 'MP-1')).toBe('paid');

    const order = (await db.collection('orders').doc(id).get()).data();
    expect(order).toMatchObject({ status: 'paid', paymentId: 'MP-1' });
    expect((await userRef().collection('library').doc(DIGITAL).get()).exists).toBe(true);
    expect((await userRef().collection('library').doc(PHYSICAL).get()).exists).toBe(false);
    expect((await userRef().collection('purchases').doc(PHYSICAL).get()).exists).toBe(true);
    expect((await db.collection('books').doc(PHYSICAL).get()).data()).toMatchObject({ stock: 0, salesCount: 2 });
    expect((await userRef().collection('cart').get()).empty).toBe(true);
  });

  it('CA-2: repeating the confirmation does not duplicate anything', async () => {
    await cart({ [DIGITAL]: 1, [PHYSICAL]: 1 });
    const { id } = await createOrderFromCart(db, BUYER, ADDRESS, 'Mercado Pago');
    await applyPaymentOutcome(db, id, 'approved', 'MP-1');
    await applyPaymentOutcome(db, id, 'approved', 'MP-1');
    await applyPaymentOutcome(db, id, 'rejected', 'MP-2');

    expect((await db.collection('orders').doc(id).get()).get('status')).toBe('paid');
    expect((await db.collection('books').doc(PHYSICAL).get()).data()).toMatchObject({ stock: 1, salesCount: 1 });
    expect((await db.collection('books').doc(DIGITAL).get()).get('salesCount')).toBe(1);
    expect((await userRef().collection('library').get()).size).toBe(1);
  });

  it('CA-3: a rejected payment does not deliver books', async () => {
    await cart({ [DIGITAL]: 1 });
    const { id } = await createOrderFromCart(db, BUYER, '', 'Mercado Pago');
    expect(await applyPaymentOutcome(db, id, 'rejected', 'MP-9')).toBe('rejected');
    expect((await userRef().collection('library').get()).empty).toBe(true);
    expect((await userRef().collection('purchases').get()).empty).toBe(true);
    expect((await userRef().collection('cart').get()).size).toBe(1);
    expect(await applyPaymentOutcome(db, id, 'approved', 'MP-10')).toBe('rejected');
  });

  it('keeps the order pending while the payment is in process', async () => {
    await cart({ [DIGITAL]: 1 });
    const { id } = await createOrderFromCart(db, BUYER, '', 'Mercado Pago');
    expect(await applyPaymentOutcome(db, id, 'pending', 'MP-3')).toBe('pending');
  });
});
