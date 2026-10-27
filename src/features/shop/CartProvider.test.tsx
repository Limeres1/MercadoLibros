import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_CART_QUANTITY } from '@/constants/statuses';
import { INITIAL_BOOKS, INITIAL_USERS } from '@/data/initialData';
import { CartProvider, getMaxQuantity, useCart } from '@/features/shop/CartProvider';
import { Book } from '@/types';

const physicalBook: Book = { ...INITIAL_BOOKS[0], id: 'book_fisico', condition: 'usado', stock: 2 };
const digitalBook: Book = { ...INITIAL_BOOKS[0], id: 'book_digital', condition: 'digital', stock: undefined };
const liveBooks = vi.hoisted(() => ({ list: [] as Book[] }));
const showToast = vi.fn();

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast }) }));
vi.mock('@/features/auth/useRequireLogin', () => ({ useRequireLogin: () => () => INITIAL_USERS[2] }));
vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({
    getBook: (id: string) => liveBooks.list.find(book => book.id === id),
    watchBooks: () => () => undefined,
  }),
}));

let cart: ReturnType<typeof useCart>;
const CartProbe: React.FC = () => {
  cart = useCart();
  return null;
};

describe('CartProvider', () => {
  beforeEach(() => {
    liveBooks.list = [physicalBook, digitalBook];
    showToast.mockClear();
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>,
    );
  });

  it('limits physical books to the available stock', () => {
    act(() => {
      cart.addToCart(physicalBook);
    });
    act(() => {
      cart.addToCart(physicalBook);
    });
    act(() => {
      expect(cart.addToCart(physicalBook)).toBe(false);
    });
    expect(cart.getCartQuantity(physicalBook.id)).toBe(2);
    expect(showToast).toHaveBeenLastCalledWith(expect.stringContaining('Sólo hay 2 ejemplares'), 'info');
  });

  it('allows a digital book only once', () => {
    act(() => {
      cart.addToCart(digitalBook);
    });
    act(() => {
      expect(cart.addToCart(digitalBook)).toBe(false);
    });
    expect(cart.getCartQuantity(digitalBook.id)).toBe(1);
  });

  it('uses the live stock from the catalog and reports it before paying', () => {
    act(() => {
      cart.addToCart(physicalBook);
      cart.updateCartQuantity(physicalBook.id, 2);
    });
    liveBooks.list = [{ ...physicalBook, stock: 1 }, digitalBook];
    act(() => {
      cart.updateCartQuantity(physicalBook.id, 2);
    });
    expect(cart.findStockProblem()).toContain('Sólo hay 1 ejemplar disponible');
  });

  it('caps quantities when stock is unknown', () => {
    expect(getMaxQuantity({ ...physicalBook, stock: undefined })).toBe(MAX_CART_QUANTITY);
    expect(getMaxQuantity({ ...physicalBook, stock: 0 })).toBe(0);
  });
});
