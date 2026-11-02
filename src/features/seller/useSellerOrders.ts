import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';

import { useSession } from '@/features/auth/SessionProvider';
import { firestoreRefs } from '@/services/firestore';
import { Order } from '@/types';

export function useSellerOrders() {
  const { currentUser } = useSession();
  const sellerId = currentUser?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders([]);
    setError(null);
    if (!sellerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return onSnapshot(
      query(firestoreRefs.orders(), where('sellerIds', 'array-contains', sellerId)),
      snapshot => {
        setOrders(snapshot.docs.map(order => order.data()));
        setIsLoading(false);
      },
      () => {
        setError('No pudimos cargar tus ventas. Recargá la página para intentar de nuevo.');
        setIsLoading(false);
      },
    );
  }, [sellerId]);

  return { orders, isLoading, error };
}
