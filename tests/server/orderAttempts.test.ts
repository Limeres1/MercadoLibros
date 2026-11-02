import { deleteApp, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@/constants/firestore';
import { applyPaymentOutcome, createOrderFromCart } from '@api/_lib/orders';

const PROJECT_ID = 'demo-mercadolibros';
const BUYER = 'buyer_orders';
const ADDRESS = 'Echeverría 3292, Belgrano, CABA';
const app = initializeApp({ projectId: PROJECT_ID }, 'orders-test');
let db: Firestore;

const book = (title: string, stock = 5) => ({
  title,
  author: 'Ernest Hemingway',
  price: 22.02,
  condition: 'nuevo',
  status: 'published',
  sellerId: 'seller_orders',
  coverUrl: '',
  stock,
  salesCount: 0,
});

const orderRef = (id: string) => db.collection(COLLECTIONS.orders).doc(id);
const statusOf = async (id: string) => (await orderRef(id).get()).get('status');
const cart = (bookId: string) =>
  db.collection(COLLECTIONS.users).doc(BUYER).collection(USER_SUBCOLLECTIONS.cart).doc(bookId);
const checkout = async () => (await createOrderFromCart(db, BUYER, ADDRESS, 'Mercado Pago')).id;

beforeAll(() => {
  delete process.env.MP_ACCESS_TOKEN;
  db = getFirestore(app);
});

afterAll(() => deleteApp(app));

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db
    .collection(COLLECTIONS.users)
    .doc(BUYER)
    .set({ displayName: 'Lev', email: 'lev@test.com', isBlocked: false });
  await db.collection(COLLECTIONS.books).doc('viejo').set(book('El viejo y el mar'));
  await db.collection(COLLECTIONS.books).doc('otro').set(book('Fiesta'));
  await cart('viejo').set({ quantity: 1, addedAt: '2026-11-01T00:00:00.000Z' });
});

describe('checkout orders', () => {
  it('several payment attempts for the same cart leave a single open order', async () => {
    const first = await checkout();
    const second = await checkout();
    const third = await checkout();

    expect(await statusOf(first)).toBe('cancelled');
    expect(await statusOf(second)).toBe('cancelled');
    expect(await statusOf(third)).toBe('pending');
    expect((await orderRef(first).get()).get('cancelReason')).toBe('Reemplazado por un nuevo intento de pago.');
    const open = await db
      .collection(COLLECTIONS.orders)
      .where('buyerId', '==', BUYER)
      .where('status', '==', 'pending')
      .get();
    expect(open.size).toBe(1);
  });

  it('paying the open order buys the book once and empties the cart', async () => {
    await checkout();
    const latest = await checkout();
    expect(await applyPaymentOutcome(db, latest, 'approved', 'PAY-1')).toBe('paid');

    const bookData = (await db.collection(COLLECTIONS.books).doc('viejo').get()).data();
    expect(bookData).toMatchObject({ salesCount: 1, stock: 4 });
    expect((await cart('viejo').get()).exists).toBe(false);
    const paid = await db
      .collection(COLLECTIONS.orders)
      .where('buyerId', '==', BUYER)
      .where('status', '==', 'paid')
      .get();
    expect(paid.size).toBe(1);
  });

  it('a late payment through an old link is not lost and closes the newer duplicate', async () => {
    const old = await checkout();
    const newer = await checkout();
    expect(await applyPaymentOutcome(db, old, 'approved', 'PAY-OLD')).toBe('paid');

    expect(await statusOf(old)).toBe('paid');
    expect(await statusOf(newer)).toBe('cancelled');
    expect((await orderRef(newer).get()).get('cancelReason')).toBe('Los libros se pagaron en otro pedido.');
    expect(await applyPaymentOutcome(db, newer, 'rejected', 'PAY-X')).toBe('cancelled');
  });

  it('a payment approved after a rejection on the same order is applied', async () => {
    const order = await checkout();
    expect(await applyPaymentOutcome(db, order, 'rejected', 'PAY-1')).toBe('rejected');
    expect(await applyPaymentOutcome(db, order, 'approved', 'PAY-2')).toBe('paid');
    expect(await applyPaymentOutcome(db, order, 'approved', 'PAY-2')).toBe('paid');
    expect((await db.collection(COLLECTIONS.books).doc('viejo').get()).get('salesCount')).toBe(1);
  });

  it('paying only closes open orders that share a book with it', async () => {
    const unrelated = 'legacy_other';
    const duplicate = 'legacy_duplicate';
    const legacy = (bookId: string) => ({
      buyerId: BUYER,
      status: 'pending',
      items: [{ bookId, sellerId: 'seller_orders', title: bookId, price: 1, quantity: 1, condition: 'nuevo' }],
      createdAt: '2026-10-01T00:00:00.000Z',
    });
    await orderRef(unrelated).set(legacy('otro'));
    const current = await checkout();
    await orderRef(duplicate).set(legacy('viejo'));

    await applyPaymentOutcome(db, current, 'approved', 'PAY-1');
    expect(await statusOf(duplicate)).toBe('cancelled');
    expect(await statusOf(current)).toBe('paid');
  });
});
