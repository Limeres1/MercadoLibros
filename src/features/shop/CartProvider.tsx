import React, { useState } from 'react';
import { Book, CartItem } from '../../types';
import { createSafeContext } from '../../lib/createSafeContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useToast } from '../../components/ui/Toast';
import { useRequireLogin } from '../auth/useRequireLogin';
import { STORAGE_KEYS } from '../../constants/storageKeys';

interface CartContextValue {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (book: Book) => boolean;
  removeFromCart: (bookId: string) => void;
  updateCartQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
}

const [Provider, useCart] = createSafeContext<CartContextValue>('useCart');
export { useCart };

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const [cart, setCart] = usePersistentState<CartItem[]>(STORAGE_KEYS.cart, []);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.book.price * item.quantity, 0);

  const addToCart = (book: Book): boolean => {
    const user = requireLogin('Debes iniciar sesión o registrarte para comprar libros.');
    if (!user) return false;
    if (user.isBlocked) {
      showToast('Tu cuenta se encuentra bloqueada para realizar compras.', 'error');
      return false;
    }
    setCart(prev =>
      prev.some(item => item.book.id === book.id)
        ? prev.map(item => (item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...prev, { book, quantity: 1 }]
    );
    showToast(`"${book.title}" añadido al carrito`, 'success');
    return true;
  };

  const removeFromCart = (bookId: string) => setCart(prev => prev.filter(item => item.book.id !== bookId));

  const updateCartQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    setCart(prev => prev.map(item => (item.book.id === bookId ? { ...item, quantity } : item)));
  };

  const clearCart = () => setCart([]);

  return (
    <Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
      }}
    >
      {children}
    </Provider>
  );
};
