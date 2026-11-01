import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';

import { INITIAL_ORDERS } from '@/data/initialData';
import { useSession } from '@/features/auth/SessionProvider';
import { firestoreRefs } from '@/services/firestore';
import { Order } from '@/types';

export function useSellerOrders(overrideSellerId?: string) {
  const { currentUser } = useSession();
  const sellerId = overrideSellerId ?? currentUser?.id;
  const [orders, setOrders] = useState<Order[]>(() =>
    sellerId ? INITIAL_ORDERS.filter(order => order.sellerIds?.includes(sellerId)) : [],
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sellerId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    const demoOrders = INITIAL_ORDERS.filter(order => order.sellerIds?.includes(sellerId));
    setOrders(demoOrders);
    setIsLoading(true);

    try {
      const ordersQuery = query(firestoreRefs.orders(), where('sellerIds', 'array-contains', sellerId));
      const unsubscribe = onSnapshot(
        ordersQuery,
        snapshot => {
          if (!snapshot.empty) {
            const firestoreOrders = snapshot.docs.map(doc => doc.data());
            setOrders(firestoreOrders);
          } else {
            setOrders(demoOrders);
          }
          setIsLoading(false);
        },
        error => {
          console.warn('Could not listen to seller orders, using demo fallback:', error);
          setOrders(demoOrders);
          setIsLoading(false);
        },
      );

      return () => unsubscribe();
    } catch {
      setIsLoading(false);
    }
  }, [sellerId]);

  return { orders, isLoading };
}
