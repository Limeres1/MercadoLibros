import { useToast } from '@/components/ui/Toast';
import { SHIPPING_COST } from '@/constants/statuses';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { useLibrary } from '@/features/reader/LibraryProvider';
import { useCart } from '@/features/shop/CartProvider';
import { useOrders } from '@/features/shop/OrdersProvider';
import { createId } from '@/lib/ids';
import { Order } from '@/types';

export function useCheckout() {
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const { addPurchasedBooks } = useLibrary();
  const { cart, cartTotal, clearCart, findStockProblem } = useCart();
  const { addOrder } = useOrders();

  const completeCheckout = async (paymentMethod: string, address?: string): Promise<boolean> => {
    const user = requireLogin('Debes iniciar sesión para finalizar la compra.');
    if (!user) return false;
    if (cart.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return false;
    }
    const stockProblem = findStockProblem();
    if (stockProblem) {
      showToast(`${stockProblem} Ajustá la cantidad en el carrito.`, 'error');
      return false;
    }

    const now = new Date().toISOString();
    const hasPhysicalBooks = cart.some(({ book }) => book.condition !== 'digital');
    const shippingCost = hasPhysicalBooks ? SHIPPING_COST : 0;
    const order: Order = {
      id: createId(),
      buyerId: user.id,
      buyerName: user.displayName,
      buyerEmail: user.email,
      items: cart.map(({ book, quantity }) => ({
        bookId: book.id,
        sellerId: book.sellerId,
        title: book.title,
        author: book.author,
        price: book.price,
        quantity,
        coverUrl: book.coverUrl,
        condition: book.condition,
      })),
      sellerIds: [...new Set(cart.map(({ book }) => book.sellerId))],
      subtotal: cartTotal,
      shippingCost,
      totalAmount: cartTotal + shippingCost,
      paymentMethod,
      shippingAddress: hasPhysicalBooks ? address : undefined,
      status: 'paid',
      createdAt: now,
      paidAt: now,
    };

    addOrder(order);
    addPurchasedBooks(
      cart.map(item => item.book).filter(book => book.condition === 'digital'),
      order.id,
    );
    clearCart();
    showToast('¡Compra realizada con éxito!', 'success');
    return true;
  };

  return { completeCheckout };
}
