import { useState } from 'react';
import { useNavigate } from 'react-router';

import { API_ROUTES } from '@/constants/api';
import { PaymentOption } from '@/constants/payments';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { useCart } from '@/features/shop/CartProvider';
import { API_ERRORS, ApiError, postApi } from '@/services/api';
import { GeoPoint } from '@/services/geocoding';

interface CheckoutResponse {
  orderId: string;
  checkoutUrl: string;
}

export function useCheckout() {
  const requireLogin = useRequireLogin();
  const navigate = useNavigate();
  const { cart, closeCart, findStockProblem } = useCart();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (
    shippingAddress: string,
    paymentOption: PaymentOption,
    shippingLocation: GeoPoint | null,
  ) => {
    if (!requireLogin('Iniciá sesión para finalizar la compra.')) return;
    if (cart.length === 0) {
      setError('Tu carrito está vacío.');
      return;
    }
    const stockProblem = findStockProblem();
    if (stockProblem) {
      setError(`${stockProblem} Ajustá la cantidad para continuar.`);
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const { checkoutUrl } = await postApi<CheckoutResponse>(API_ROUTES.checkout, {
        shippingAddress,
        paymentOption,
        shippingLocation,
      });
      if (checkoutUrl.startsWith('/')) {
        closeCart();
        navigate(checkoutUrl);
      } else {
        window.location.assign(checkoutUrl);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : API_ERRORS.unknown);
    } finally {
      setIsStarting(false);
    }
  };

  return { startCheckout, isStarting, error, clearError: () => setError(null) };
}
