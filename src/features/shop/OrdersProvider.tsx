import React from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_ORDERS } from '@/data/initialData';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { Order } from '@/types';

interface OrdersContextValue {
  orders: Order[];
  addOrder: (order: Order) => void;
}

const [Provider, useOrders] = createSafeContext<OrdersContextValue>('useOrders');
export { useOrders };

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = usePersistentState<Order[]>(STORAGE_KEYS.orders, INITIAL_ORDERS);

  const addOrder = (order: Order) => setOrders(prev => [order, ...prev]);

  return <Provider value={{ orders, addOrder }}>{children}</Provider>;
};
