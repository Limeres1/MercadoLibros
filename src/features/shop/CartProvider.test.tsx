import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_CART_QUANTITY } from '@/constants/statuses';
import { INITIAL_BOOKS, INITIAL_USERS } from '@/data/initialData';
import { CartProvider, getMaxQuantity, useCart } from '@/features/shop/CartProvider';
import { Book } from '@/types';

const physicalBook: Book = { ...INITIAL_BOOKS[0], id: 'book_fisico', condition: 'usado', stock: 2 };
const digitalBook: Book = { ...INITIAL_BOOKS[0], id: 'book_digital', condition: 'digital', stock: undefined };

const fake = vi.hoisted(() => {
  const carts: Record<string, Record<string, Record<string, unknown>>> = {};
  const listeners: Record<string, (snapshot: unknown) => void> = {};
  const emit = (uid: string) =>
    listeners[uid]?.({
      docs: Object.entries(carts[uid] ?? {}).map(([bookId, data]) => ({ data: () => ({ ...data, bookId }) })),
    });
  return {
    carts,
    listeners,
    emit,
    session: { currentUser: null as unknown },
    liveBooks: [] as Book[],
    owned: [] as string[],
  };
});

const showToast = vi.fn();

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/firestore', () => ({ firestoreRefs: { cart: (uid: string) => ({ uid }) } }));
vi.mock('firebase/firestore', () => ({
  doc: (ref: { uid: string }, id: string) => ({ uid: ref.uid, id }),
  onSnapshot: (ref: { uid: string }, listener: (snapshot: unknown) => void) => {
    fake.listeners[ref.uid] = listener;
    fake.emit(ref.uid);
    return () => delete fake.listeners[ref.uid];
  },
  setDoc: async (ref: { uid: string; id: string }, data: Record<string, unknown>) => {
    fake.carts[ref.uid] = { ...fake.carts[ref.uid], [ref.id]: data };
    fake.emit(ref.uid);
  },
  updateDoc: async (ref: { uid: string; id: string }, data: Record<string, unknown>) => {
    fake.carts[ref.uid][ref.id] = { ...fake.carts[ref.uid][ref.id], ...data };
    fake.emit(ref.uid);
  },
  deleteDoc: async (ref: { uid: string; id: string }) => {
    delete fake.carts[ref.uid][ref.id];
    fake.emit(ref.uid);
  },
  writeBatch: () => {
    const removals: { uid: string; id: string }[] = [];
    return {
      delete: (ref: { uid: string; id: string }) => removals.push(ref),
      commit: async () => {
        removals.forEach(ref => delete fake.carts[ref.uid][ref.id]);
        removals.forEach(ref => fake.emit(ref.uid));
      },
    };
  },
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast }) }));
vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => fake.session }));
vi.mock('@/features/auth/useRequireLogin', () => ({ useRequireLogin: () => () => fake.session.currentUser }));
vi.mock('@/features/reader/LibraryProvider', () => ({
  useLibrary: () => ({ hasPurchased: (id: string) => fake.owned.includes(id) }),
}));
vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({
    getBook: (id: string) => fake.liveBooks.find(book => book.id === id),
    watchBooks: () => () => undefined,
  }),
}));

let cart: ReturnType<typeof useCart>;
const CartProbe: React.FC = () => {
  cart = useCart();
  return null;
};

const renderCart = () =>
  render(
    <CartProvider>
      <CartProbe />
    </CartProvider>,
  );

const add = async (book: Book) => {
  let added = false;
  await act(async () => {
    added = cart.addToCart(book);
  });
  return added;
};

describe('CartProvider', () => {
  beforeEach(() => {
    Object.keys(fake.carts).forEach(uid => delete fake.carts[uid]);
    fake.session.currentUser = INITIAL_USERS[2];
    fake.liveBooks = [physicalBook, digitalBook];
    fake.owned = [];
    showToast.mockClear();
  });

  it('limits physical books to the available stock', async () => {
    renderCart();
    await add(physicalBook);
    await add(physicalBook);
    expect(await add(physicalBook)).toBe(false);
    expect(cart.getCartQuantity(physicalBook.id)).toBe(2);
    expect(showToast).toHaveBeenLastCalledWith(expect.stringContaining('Sólo hay 2 ejemplares'), 'info');
  });

  it('allows a digital book only once', async () => {
    renderCart();
    await add(digitalBook);
    expect(await add(digitalBook)).toBe(false);
    expect(cart.getCartQuantity(digitalBook.id)).toBe(1);
  });

  it('does not add a digital book the user already owns', async () => {
    fake.owned = [digitalBook.id];
    renderCart();
    expect(await add(digitalBook)).toBe(false);
    expect(showToast).toHaveBeenLastCalledWith(expect.stringContaining('ya está en tu biblioteca'), 'info');
  });

  it('keeps a separate cart for each user and empties it on logout', async () => {
    const view = renderCart();
    await add(physicalBook);
    expect(cart.cartCount).toBe(1);

    fake.session.currentUser = null;
    view.rerender(
      <CartProvider>
        <CartProbe />
      </CartProvider>,
    );
    expect(cart.cartCount).toBe(0);

    fake.session.currentUser = INITIAL_USERS[1];
    view.rerender(
      <CartProvider>
        <CartProbe />
      </CartProvider>,
    );
    expect(cart.cartCount).toBe(0);

    fake.session.currentUser = INITIAL_USERS[2];
    view.rerender(
      <CartProvider>
        <CartProbe />
      </CartProvider>,
    );
    expect(cart.cartCount).toBe(1);
  });

  it('reports stock problems with the live stock before paying', async () => {
    renderCart();
    await add(physicalBook);
    await add(physicalBook);
    fake.liveBooks = [{ ...physicalBook, stock: 1 }, digitalBook];
    await act(async () => fake.emit(INITIAL_USERS[2].id));
    expect(cart.findStockProblem()).toContain('Sólo hay 1 ejemplar disponible');
  });

  it('caps quantities when stock is unknown', () => {
    expect(getMaxQuantity({ ...physicalBook, stock: undefined })).toBe(MAX_CART_QUANTITY);
    expect(getMaxQuantity({ ...physicalBook, stock: 0 })).toBe(0);
  });
});
