import React from 'react';
import { Order } from '../../types';
import { INITIAL_ORDERS } from '../../data/initialData';
import { createSafeContext } from '../../lib/createSafeContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { STORAGE_KEYS } from '../../constants/storageKeys';

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
