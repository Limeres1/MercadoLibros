import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_BOOKS, INITIAL_LIBRARY } from '@/data/initialData';
import { ReaderPage } from '@/features/reader/ReaderPage';
import { Book, LibraryItem } from '@/types';

const state = vi.hoisted(() => ({
  book: undefined as Book | undefined,
  item: undefined as LibraryItem | undefined,
  bookLoading: false,
  libraryLoading: false,
  loadContent: vi.fn(),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBook: () => ({ book: state.book, isLoading: state.bookLoading }),
  useBookContent: () => {
    state.loadContent();
    return { text: 'Texto completo comprado.', isLoading: false };
  },
}));

vi.mock('@/features/reader/LibraryProvider', () => ({
  useLibrary: () => ({
    getItem: (bookId: string) => (state.item?.bookId === bookId ? state.item : undefined),
    isLoading: state.libraryLoading,
    updateReadingProgress: vi.fn(),
    addBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
  }),
}));

const renderReader = () =>
  render(
    <MemoryRouter initialEntries={['/leer/purchased-book']}>
      <Routes>
        <Route path="/leer/:bookId" element={<ReaderPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  state.book = { ...INITIAL_BOOKS[0], id: 'purchased-book' };
  state.item = { ...INITIAL_LIBRARY[0], bookId: 'purchased-book', bookmarks: [] };
  state.bookLoading = false;
  state.libraryLoading = false;
  state.loadContent.mockClear();
});

describe('reader purchase access', () => {
  it('waits for the library instead of denying access before the purchase arrives', () => {
    state.item = undefined;
    state.libraryLoading = true;
    const view = renderReader();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Este libro no está en tu biblioteca')).not.toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();

    state.libraryLoading = false;
    state.item = { ...INITIAL_LIBRARY[0], bookId: 'purchased-book', bookmarks: [] };
    view.rerender(
      <MemoryRouter initialEntries={['/leer/purchased-book']}>
        <Routes>
          <Route path="/leer/:bookId" element={<ReaderPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Texto completo comprado.')).toBeInTheDocument();
  });

  it('waits for book metadata before opening the reader', () => {
    state.book = undefined;
    state.bookLoading = true;
    renderReader();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it('does not request full text for an unpurchased book opened by URL', () => {
    state.item = undefined;
    renderReader();
    expect(screen.getByText('Este libro no está en tu biblioteca')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it('does not grant access using a different purchased book', () => {
    state.item = { ...INITIAL_LIBRARY[0], bookId: 'another-book' };
    renderReader();
    expect(screen.getByText('Este libro no está en tu biblioteca')).toBeInTheDocument();
    expect(state.loadContent).not.toHaveBeenCalled();
  });

  it.each(['published', 'withdrawn'] as const)('opens a purchased %s book', status => {
    state.book = { ...state.book!, status };
    renderReader();
    expect(screen.getByText('Texto completo comprado.')).toBeInTheDocument();
  });
});
