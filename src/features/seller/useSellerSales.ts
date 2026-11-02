import { useEffect, useState } from 'react';

import { API_ROUTES } from '@/constants/api';
import { useSession } from '@/features/auth/SessionProvider';
import { API_ERRORS, ApiError, postApi } from '@/services/api';
import { SellerSale } from '@/types';

export function useSellerSales() {
  const { currentUser } = useSession();
  const sellerId = currentUser?.id;
  const [sales, setSales] = useState<SellerSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setSales([]);
    setError(null);
    if (!sellerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    postApi<{ sales: SellerSale[] }>(API_ROUTES.sellerSales, {})
      .then(response => isCurrent && setSales(response.sales))
      .catch(caught => isCurrent && setError(caught instanceof ApiError ? caught.message : API_ERRORS.unknown))
      .finally(() => isCurrent && setIsLoading(false));
    return () => {
      isCurrent = false;
    };
  }, [sellerId]);

  return { sales, isLoading, error };
}
