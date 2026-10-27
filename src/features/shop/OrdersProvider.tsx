import React, { useEffect, useRef, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { API_ROUTES } from '@/constants/api';
import { PAYMENT_SYNC_INTERVAL_MS } from '@/constants/payments';
import { useSession } from '@/features/auth/SessionProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { postApi } from '@/services/api';
import { firestoreRefs } from '@/services/firestore';
import { Order, OrderStatus } from '@/types';

const AUTO_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

interface OrdersContextValue {
  orders: Order[];
  isLoading: boolean;
}

const [Provider, useOrders] = createSafeContext<OrdersContextValue>('useOrders');
export { useOrders };

const isAwaitingPayment = (order: Order) =>
  order.status === 'pending' &&
  Boolean(order.preferenceId) &&
  Date.now() - Date.parse(order.createdAt) < AUTO_SYNC_WINDOW_MS;

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const statusesRef = useRef<Map<string, OrderStatus> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const userId = currentUser?.id;

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    setOrders([]);
    statusesRef.current = null;
    if (!userId) return;
    setIsLoading(true);
    return onSnapshot(
      query(firestoreRefs.orders(), where('buyerId', '==', userId)),
      snapshot => {
        const next = snapshot.docs
          .map(orderDoc => orderDoc.data())
          .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
        const previous = statusesRef.current;
        next.forEach(order => {
          if (previous?.get(order.id) !== 'pending') return;
          if (order.status === 'paid') {
            showToastRef.current('¡Pago aprobado! Tus libros digitales ya están en tu biblioteca.', 'success');
          } else if (order.status === 'rejected') {
            showToastRef.current('El pago fue rechazado. Los libros siguen en tu carrito.', 'error');
          }
        });
        statusesRef.current = new Map(next.map(order => [order.id, order.status]));
        setOrders(next);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [userId]);

  const awaitingIds = orders
    .filter(isAwaitingPayment)
    .map(order => order.id)
    .join('|');

  useEffect(() => {
    if (!awaitingIds) return;
    const orderIds = awaitingIds.split('|');
    const sync = () => {
      if (document.visibilityState !== 'visible') return;
      orderIds.forEach(orderId => postApi(API_ROUTES.paymentSync, { orderId }).catch(() => undefined));
    };
    sync();
    const interval = window.setInterval(sync, PAYMENT_SYNC_INTERVAL_MS);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [awaitingIds]);

  return <Provider value={{ orders, isLoading }}>{children}</Provider>;
};
