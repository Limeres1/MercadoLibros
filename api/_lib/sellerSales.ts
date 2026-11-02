import { Firestore } from 'firebase-admin/firestore';

import { COLLECTIONS } from '../../src/constants/firestore.js';
import type { Order, SellerSale } from '../../src/types/index.js';

export function salesOfSeller(orders: Order[], sellerId: string): SellerSale[] {
  return orders.flatMap(order =>
    order.status === 'paid' && order.paidAt
      ? order.items
          .filter(item => item.sellerId === sellerId)
          .map(item => ({
            orderId: order.id,
            paidAt: order.paidAt as string,
            bookId: item.bookId,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            buyerName: order.buyerName,
          }))
      : [],
  );
}

export async function loadSellerSales(db: Firestore, sellerId: string) {
  const snapshot = await db.collection(COLLECTIONS.orders).where('sellerIds', 'array-contains', sellerId).get();
  const orders = snapshot.docs.map(order => ({ ...order.data(), id: order.id }) as Order);
  return salesOfSeller(orders, sellerId).sort((first, second) => second.paidAt.localeCompare(first.paidAt));
}
