import React, { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { MAX_CART_QUANTITY } from '@/constants/statuses';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { useBooks } from '@/features/catalog/BooksProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { Book, CartItem } from '@/types';

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
  getCartQuantity: (bookId: string) => number;
  findStockProblem: () => string | null;
  clearCart: () => void;
}

const [Provider, useCart] = createSafeContext<CartContextValue>('useCart');
export { useCart };

export const getMaxQuantity = (book: Book) =>
  book.condition === 'digital' ? 1 : Math.min(book.stock ?? MAX_CART_QUANTITY, MAX_CART_QUANTITY);

const limitMessage = (book: Book) => {
  if (book.condition === 'digital')
    return `"${book.title}" ya está en tu carrito. Los libros digitales se compran una vez.`;
  const available = getMaxQuantity(book);
  if (available <= 0) return `"${book.title}" no tiene stock disponible.`;
  return book.stock !== undefined && book.stock <= MAX_CART_QUANTITY
    ? `Sólo hay ${available} ${available === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'} de "${book.title}".`
    : `Podés llevar hasta ${MAX_CART_QUANTITY} ejemplares de "${book.title}" por pedido.`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const { getBook, watchBooks } = useBooks();
  const [storedCart, setCart] = usePersistentState<CartItem[]>(STORAGE_KEYS.cart, []);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartBookIds = storedCart
    .map(item => item.book.id)
    .sort()
    .join('|');

  useEffect(() => (cartBookIds ? watchBooks(cartBookIds.split('|')) : undefined), [cartBookIds, watchBooks]);

  const cart = useMemo(
    () => storedCart.map(item => ({ ...item, book: getBook(item.book.id) ?? item.book })),
    [storedCart, getBook],
  );

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.book.price * item.quantity, 0);

  const getCartQuantity = (bookId: string) => cart.find(item => item.book.id === bookId)?.quantity ?? 0;

  const addToCart = (book: Book): boolean => {
    const user = requireLogin('Iniciá sesión o registrate para comprar libros.');
    if (!user) return false;
    if (user.isBlocked) {
      showToast('Tu cuenta está bloqueada y no puede realizar compras.', 'error');
      return false;
    }
    const currentBook = getBook(book.id) ?? book;
    const nextQuantity = getCartQuantity(book.id) + 1;
    if (nextQuantity > getMaxQuantity(currentBook)) {
      showToast(limitMessage(currentBook), 'info');
      return false;
    }
    setCart(prev =>
      prev.some(item => item.book.id === book.id)
        ? prev.map(item => (item.book.id === book.id ? { ...item, quantity: nextQuantity } : item))
        : [...prev, { book: currentBook, quantity: 1 }],
    );
    showToast(`"${book.title}" agregado al carrito.`, 'success');
    return true;
  };

  const removeFromCart = (bookId: string) => setCart(prev => prev.filter(item => item.book.id !== bookId));

  const updateCartQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    const item = cart.find(candidate => candidate.book.id === bookId);
    if (!item) return;
    if (quantity > getMaxQuantity(item.book)) {
      showToast(limitMessage(item.book), 'info');
      return;
    }
    setCart(prev => prev.map(candidate => (candidate.book.id === bookId ? { ...candidate, quantity } : candidate)));
  };

  const findStockProblem = () => {
    const item = cart.find(candidate => candidate.quantity > getMaxQuantity(candidate.book));
    return item ? limitMessage(item.book) : null;
  };

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
        getCartQuantity,
        findStockProblem,
        clearCart: () => setCart([]),
      }}
    >
      {children}
    </Provider>
  );
};
