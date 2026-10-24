import { Order } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { useRequireLogin } from '../auth/useRequireLogin';
import { useBooks } from '../catalog/BooksProvider';
import { useLibrary } from '../reader/LibraryProvider';
import { useCart } from './CartProvider';
import { useOrders } from './OrdersProvider';

export function useCheckout() {
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const { updateBook } = useBooks();
  const { addPurchasedBooks } = useLibrary();
  const { cart, cartTotal, clearCart } = useCart();
  const { addOrder } = useOrders();

  const completeCheckout = async (paymentMethod: string, address?: string): Promise<boolean> => {
    const user = requireLogin('Debes iniciar sesión para finalizar la compra.');
    if (!user) return false;
    if (cart.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return false;
    }

    const order: Order = {
      id: 'ORD-' + Date.now(),
      buyerId: user.id,
      buyerName: user.displayName,
      buyerEmail: user.email,
      items: cart.map(({ book }) => ({
        bookId: book.id,
        title: book.title,
        author: book.author,
        price: book.price,
        coverUrl: book.coverUrl,
        condition: book.condition,
      })),
      totalAmount: cartTotal,
      paymentMethod,
      shippingAddress: address,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    cart.forEach(({ book, quantity }) =>
      updateBook(book.id, b => ({
        salesCount: (b.salesCount || 0) + quantity,
        stock: b.stock !== undefined ? Math.max(0, b.stock - quantity) : undefined,
      }))
    );
    addOrder(order);
    addPurchasedBooks(cart.map(item => item.book));
    clearCart();
    showToast('¡Compra realizada con éxito! Los libros ya están disponibles en tu Biblioteca.', 'success');
    return true;
  };

  return { completeCheckout };
}
