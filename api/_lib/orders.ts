import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

import { COLLECTIONS, USER_SUBCOLLECTIONS } from '../../src/constants/firestore.js';
import { MAX_CART_QUANTITY, SHIPPING_COST } from '../../src/constants/statuses.js';
import { paginateReaderText } from '../../src/lib/readerPagination.js';

export class CheckoutError extends Error {}

interface OrderItem {
  bookId: string;
  sellerId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  coverUrl: string;
  condition: string;
}

export interface PendingOrder {
  id: string;
  items: OrderItem[];
  totalAmount: number;
}

const MIN_ADDRESS_LENGTH = 8;
const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

export async function createOrderFromCart(
  db: Firestore,
  userId: string,
  shippingAddress: string,
  paymentMethod: string,
  shippingLocation: { lat: number; lng: number } | null = null,
): Promise<PendingOrder> {
  const userRef = db.collection(COLLECTIONS.users).doc(userId);
  const [userSnapshot, cartSnapshot] = await Promise.all([
    userRef.get(),
    userRef.collection(USER_SUBCOLLECTIONS.cart).get(),
  ]);
  const user = userSnapshot.data();
  if (!user) throw new CheckoutError('No encontramos tu perfil. Volvé a iniciar sesión.');
  if (user.isBlocked) throw new CheckoutError('Tu cuenta está bloqueada y no puede realizar compras.');
  if (cartSnapshot.empty) throw new CheckoutError('Tu carrito está vacío.');

  const cart = cartSnapshot.docs.map(entry => ({ bookId: entry.id, quantity: Number(entry.get('quantity')) }));
  const books = await db.getAll(...cart.map(entry => db.collection(COLLECTIONS.books).doc(entry.bookId)));
  const owned = await db.getAll(
    ...cart.map(entry => userRef.collection(USER_SUBCOLLECTIONS.purchases).doc(entry.bookId)),
    ...cart.map(entry => userRef.collection(USER_SUBCOLLECTIONS.library).doc(entry.bookId)),
  );
  const ownedIds = new Set(owned.filter(snapshot => snapshot.exists).map(snapshot => snapshot.id));

  const items: OrderItem[] = cart.map((entry, index) => {
    const book = books[index].data();
    if (!book || book.status !== 'published') {
      throw new CheckoutError('Uno de los libros de tu carrito ya no está a la venta. Quitalo para continuar.');
    }
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > MAX_CART_QUANTITY) {
      throw new CheckoutError(`La cantidad de "${book.title}" no es válida.`);
    }
    if (book.condition === 'digital' && (entry.quantity !== 1 || ownedIds.has(entry.bookId))) {
      throw new CheckoutError(`Ya compraste "${book.title}". Lo encontrás en tu biblioteca.`);
    }
    if (book.condition !== 'digital' && book.stock !== undefined && book.stock < entry.quantity) {
      throw new CheckoutError(
        book.stock > 0
          ? `Sólo quedan ${book.stock} ejemplares de "${book.title}". Ajustá la cantidad.`
          : `"${book.title}" se quedó sin stock. Quitalo del carrito para continuar.`,
      );
    }
    return {
      bookId: entry.bookId,
      sellerId: book.sellerId,
      title: book.title,
      author: book.author,
      price: book.price,
      quantity: entry.quantity,
      coverUrl: book.coverUrl,
      condition: book.condition,
    };
  });

  const hasPhysical = items.some(item => item.condition !== 'digital');
  const address = shippingAddress.trim();
  if (hasPhysical && address.length < MIN_ADDRESS_LENGTH) {
    throw new CheckoutError('Ingresá una dirección de envío válida para los libros impresos.');
  }

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const shippingCost = hasPhysical ? SHIPPING_COST : 0;
  const order = {
    buyerId: userId,
    buyerName: user.displayName,
    buyerEmail: user.email,
    items,
    sellerIds: [...new Set(items.map(item => item.sellerId))].sort(),
    subtotal,
    shippingCost,
    totalAmount: roundMoney(subtotal + shippingCost),
    paymentMethod,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...(hasPhysical ? { shippingAddress: address } : {}),
    ...(hasPhysical && shippingLocation ? { shippingLocation } : {}),
  };
  const id = randomUUID();
  await db.collection(COLLECTIONS.orders).doc(id).set(order);
  return { id, items, totalAmount: order.totalAmount };
}

export type PaymentOutcome = 'approved' | 'rejected' | 'pending';

export const outcomeFromStatus = (status: string): PaymentOutcome =>
  status === 'approved'
    ? 'approved'
    : ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)
      ? 'rejected'
      : 'pending';

export async function applyPaymentOutcome(
  db: Firestore,
  orderId: string,
  outcome: PaymentOutcome,
  paymentId: string,
): Promise<string> {
  const orderRef = db.collection(COLLECTIONS.orders).doc(orderId);
  return db.runTransaction(async transaction => {
    const orderSnapshot = await transaction.get(orderRef);
    const order = orderSnapshot.data();
    if (!order) throw new CheckoutError('No encontramos el pedido.');
    if (order.status !== 'pending' || outcome === 'pending') return order.status as string;

    if (outcome === 'rejected') {
      transaction.update(orderRef, { status: 'rejected', paymentId });
      return 'rejected';
    }

    const items = order.items as OrderItem[];
    const userRef = db.collection(COLLECTIONS.users).doc(order.buyerId);
    const bookRefs = items.map(item => db.collection(COLLECTIONS.books).doc(item.bookId));
    const libraryRefs = items.map(item => userRef.collection(USER_SUBCOLLECTIONS.library).doc(item.bookId));
    const purchaseRefs = items.map(item => userRef.collection(USER_SUBCOLLECTIONS.purchases).doc(item.bookId));
    const contentRefs = items.map(item => db.collection(COLLECTIONS.bookContents).doc(item.bookId));
    const [books, libraryItems, purchases, contents] = await Promise.all([
      transaction.getAll(...bookRefs),
      transaction.getAll(...libraryRefs),
      transaction.getAll(...purchaseRefs),
      transaction.getAll(...contentRefs),
    ]);

    const paidAt = new Date().toISOString();
    items.forEach((item, index) => {
      const book = books[index].data();
      const stock = book?.stock;
      if (book) {
        transaction.update(bookRefs[index], {
          salesCount: FieldValue.increment(item.quantity),
          ...(typeof stock === 'number' ? { stock: Math.max(0, stock - item.quantity) } : {}),
        });
      }
      if (!purchases[index].exists) {
        transaction.set(purchaseRefs[index], { orderId, purchasedAt: paidAt });
      }
      if (item.condition === 'digital' && !libraryItems[index].exists) {
        const text = contents[index].get('text');
        transaction.set(libraryRefs[index], {
          userId: order.buyerId,
          bookId: item.bookId,
          orderId,
          title: item.title,
          author: item.author,
          coverUrl: item.coverUrl,
          purchasedAt: paidAt,
          lastReadPage: 0,
          totalPages: Math.max(1, paginateReaderText(typeof text === 'string' ? text : '').length),
          bookmarks: [],
        });
      }
      transaction.delete(userRef.collection(USER_SUBCOLLECTIONS.cart).doc(item.bookId));
    });
    transaction.update(orderRef, { status: 'paid', paidAt, paymentId });
    return 'paid';
  });
}

export const newSimulatedPaymentId = () => `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
