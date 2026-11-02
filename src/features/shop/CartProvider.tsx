import React, { useEffect, useMemo, useRef, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { MAX_CART_QUANTITY } from '@/constants/statuses';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useLibrary } from '@/features/reader/LibraryProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { db } from '@/services/firebase';
import { firestoreRefs } from '@/services/firestore';
import { Book, CartEntry, CartItem } from '@/types';

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
  clearCart: () => Promise<void>;
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
  const { currentUser } = useSession();
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const { getBook, watchBooks } = useBooks();
  const { hasPurchased } = useLibrary();
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const userId = currentUser?.id;

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    setEntries([]);
    setIsCartOpen(false);
    if (!userId) return;
    return onSnapshot(
      firestoreRefs.cart(userId),
      snapshot => setEntries(snapshot.docs.map(entryDoc => entryDoc.data())),
      error => showToastRef.current(getErrorMessage(error), 'error'),
    );
  }, [userId]);

  const cartBookIds = entries
    .map(entry => entry.bookId)
    .sort()
    .join('|');

  useEffect(() => (cartBookIds ? watchBooks(cartBookIds.split('|')) : undefined), [cartBookIds, watchBooks]);

  const cart = useMemo(
    () =>
      [...entries]
        .sort((first, second) => first.addedAt.localeCompare(second.addedAt))
        .map(entry => ({ book: getBook(entry.bookId), quantity: entry.quantity }))
        .filter((item): item is CartItem => Boolean(item.book)),
    [entries, getBook],
  );

  const cartCount = entries.reduce((total, entry) => total + entry.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.book.price * item.quantity, 0);

  const getCartQuantity = (bookId: string) => entries.find(entry => entry.bookId === bookId)?.quantity ?? 0;

  const persist = (write: Promise<void>) => write.catch(error => showToast(getErrorMessage(error), 'error'));

  const addToCart = (book: Book): boolean => {
    const user = requireLogin('Iniciá sesión o registrate para comprar libros.');
    if (!user) return false;
    if (user.isBlocked) {
      showToast('Tu cuenta está bloqueada y no puede realizar compras.', 'error');
      return false;
    }
    const currentBook = getBook(book.id) ?? book;
    if (currentBook.condition === 'digital' && hasPurchased(book.id)) {
      showToast(`"${book.title}" ya está en tu biblioteca.`, 'info');
      return false;
    }
    const existing = entries.find(entry => entry.bookId === book.id);
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > getMaxQuantity(currentBook)) {
      showToast(limitMessage(currentBook), 'info');
      return false;
    }
    persist(
      setDoc(doc(firestoreRefs.cart(user.id), book.id), {
        bookId: book.id,
        quantity: nextQuantity,
        addedAt: existing?.addedAt ?? new Date().toISOString(),
      }),
    );
    showToast(`"${book.title}" agregado al carrito.`, 'success');
    return true;
  };

  const removeFromCart = (bookId: string) => {
    if (userId) persist(deleteDoc(doc(firestoreRefs.cart(userId), bookId)));
  };

  const updateCartQuantity = (bookId: string, quantity: number) => {
    if (!userId) return;
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    const book = getBook(bookId);
    if (book && quantity > getMaxQuantity(book)) {
      showToast(limitMessage(book), 'info');
      return;
    }
    persist(updateDoc(doc(firestoreRefs.cart(userId), bookId), { quantity }));
  };

  const findStockProblem = () => {
    const item = cart.find(candidate => candidate.quantity > getMaxQuantity(candidate.book));
    return item ? limitMessage(item.book) : null;
  };

  const clearCart = async () => {
    if (!userId || entries.length === 0) return;
    const batch = writeBatch(db);
    entries.forEach(entry => batch.delete(doc(firestoreRefs.cart(userId), entry.bookId)));
    await persist(batch.commit());
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
        clearCart,
      }}
    >
      {children}
    </Provider>
  );
};
