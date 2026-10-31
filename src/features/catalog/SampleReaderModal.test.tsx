import { MemoryRouter, Route, Routes } from 'react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_BOOKS } from '@/data/initialData';
import { BookDetailPage } from '@/features/catalog/BookDetailPage';
import { SampleReaderModal } from '@/features/catalog/SampleReaderModal';
import { Book } from '@/types';

const fake = vi.hoisted(() => ({
  book: undefined as Book | undefined,
  addToCart: vi.fn(),
  fullText: vi.fn(),
  requireLogin: vi.fn(),
  close: vi.fn(),
}));
vi.mock('@/features/catalog/BooksProvider', () => ({
  useBook: () => ({ book: fake.book, isLoading: false }),
  useBookContent: (...args: unknown[]) => {
    fake.fullText(...args);
    throw new Error('Free samples must not load full content');
  },
}));
vi.mock('@/services/firestore', () => ({
  firestoreRefs: { bookContent: (...args: unknown[]) => fake.fullText(...args) },
}));
vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => ({ currentUser: null }) }));
vi.mock('@/features/auth/useRequireLogin', () => ({ useRequireLogin: () => fake.requireLogin }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/features/catalog/favorites/FavoritesProvider', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }),
}));
vi.mock('@/features/shop/CartProvider', () => ({
  useCart: () => ({
    addToCart: fake.addToCart,
    getCartQuantity: () => 0,
    updateCartQuantity: vi.fn(),
    openCart: vi.fn(),
  }),
  getMaxQuantity: () => 10,
}));
vi.mock('@/features/reader/LibraryProvider', () => ({ useLibrary: () => ({ hasPurchased: () => false }) }));
vi.mock('@/features/catalog/reviews/BookReviews', () => ({ BookReviews: () => null }));
vi.mock('@/features/catalog/reports/ReportModal', () => ({ ReportModal: () => null }));

const sampleBook = (overrides: Partial<Book> = {}): Book => ({
  ...INITIAL_BOOKS[0],
  status: 'published',
  condition: 'digital',
  sampleText: 'Primera línea del fragmento.\n\nSegunda línea del fragmento.',
  ...overrides,
});
const renderSample = (book = sampleBook()) => render(<SampleReaderModal book={book} onClose={fake.close} />);
const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/libro/book_1']}>
      <Routes>
        <Route path="/libro/:bookId" element={<BookDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fake.book = sampleBook();
});

describe('free sample', () => {
  it('opens for a guest without purchase or login and never requests the full text', () => {
    renderDetail();
    screen.getByRole('button', { name: 'Leer muestra gratis' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Leer muestra gratis' }));
    const dialog = screen.getByRole('dialog', { name: fake.book!.title });
    expect(within(dialog).getByRole('region', { name: 'Texto de la muestra' })).toHaveTextContent(
      'Primera línea del fragmento.',
    );
    expect(within(dialog).getByText('Fin del fragmento de muestra')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(fake.requireLogin).not.toHaveBeenCalled();
    expect(fake.fullText).not.toHaveBeenCalled();
    expect(fake.addToCart).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar muestra' })[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leer muestra gratis' })).toHaveFocus();
  });

  it.each(['', ' \n\t '])('disables the sample entry for empty or whitespace-only text (%s)', sampleText => {
    fake.book = sampleBook({ sampleText });
    renderDetail();
    const button = screen.getByRole('button', { name: 'Muestra no disponible' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fake.fullText).not.toHaveBeenCalled();
  });

  it('shows a safe empty state without pretending a sample ended or substituting other text', () => {
    renderSample(
      sampleBook({
        sampleText: ' \n ',
        description: 'Sinopsis que no es una muestra',
        text: 'Texto completo privado',
      } as Partial<Book>),
    );
    expect(screen.getByRole('region', { name: 'Texto de la muestra' })).toHaveTextContent('Fragmento no disponible');
    expect(screen.queryByText('Fin del fragmento de muestra')).not.toBeInTheDocument();
    expect(screen.queryByText('Texto completo privado')).not.toBeInTheDocument();
    expect(screen.queryByText('Sinopsis que no es una muestra')).not.toBeInTheDocument();
    expect(fake.fullText).not.toHaveBeenCalled();
  });

  it('renders sample markup as plain text', () => {
    const markup = '<script>alert("private")</script><img src=x onerror=alert(1)>';
    renderSample(sampleBook({ sampleText: markup }));
    const sample = screen.getByRole('region', { name: 'Texto de la muestra' });
    expect(sample).toHaveTextContent(markup);
    expect(sample.querySelector('script, img')).toBeNull();
  });

  it.each(['escape', 'backdrop'])('closes by %s', action => {
    renderSample();
    if (action === 'escape') fireEvent.keyDown(window, { key: 'Escape' });
    else fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(fake.close).toHaveBeenCalledTimes(1);
  });

  it('adds an available book to the cart without requesting full text', () => {
    const book = sampleBook();
    renderSample(book);
    fireEvent.click(screen.getByRole('button', { name: /Comprar por/ }));
    expect(fake.addToCart).toHaveBeenCalledWith(book);
    expect(fake.close).toHaveBeenCalledTimes(1);
    expect(fake.fullText).not.toHaveBeenCalled();
  });

  it.each([{ condition: 'usado', stock: 0 }, { status: 'withdrawn' }] satisfies Partial<Book>[])(
    'keeps the sample readable but prevents purchase of unavailable books (%j)',
    overrides => {
      renderSample(sampleBook(overrides));
      expect(screen.getByRole('region', { name: 'Texto de la muestra' })).toHaveTextContent('Primera línea');
      const buy = screen.getByRole('button', { name: 'No disponible para comprar' });
      expect(buy).toBeDisabled();
      fireEvent.click(buy);
      expect(fake.addToCart).not.toHaveBeenCalled();
    },
  );
});
