import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_ORDERS } from '@/data/initialData';
import { SellerDashboard } from '@/features/seller/SellerDashboard';
import { Book } from '@/types';

const mockWithdrawBook = vi.fn();
const mockSaveBook = vi.fn();

let currentSellerId = 'user_seller_1';

const mockSellerBooks: Book[] = [
  {
    id: 'book_1',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '978-8420471839',
    description: 'Desc',
    price: 18.5,
    condition: 'nuevo',
    genre: 'Ficción',
    language: 'Español',
    coverUrl: 'https://example.com/cover1.jpg',
    sampleText: 'Sample',
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez',
    status: 'published',
    rating: 4.8,
    reviewCount: 31,
    salesCount: 124,
    pages: 432,
    publicationYear: 1967,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'book_draft_1',
    title: 'Borrador Personal',
    author: 'Clara Méndez',
    isbn: '978-0000000000',
    description: 'Desc borrador',
    price: 10,
    condition: 'digital',
    genre: 'Ensayo',
    language: 'Español',
    coverUrl: 'https://example.com/cover2.jpg',
    sampleText: 'Sample borrador',
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez',
    status: 'draft',
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 150,
    publicationYear: 2025,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({
    currentUser: {
      id: currentSellerId,
      displayName: 'Vendedor Test',
      role: 'seller' as const,
      email: 'seller@test.com',
      createdAt: '2025-01-01',
    },
  }),
}));

vi.mock('@/features/seller/useSellerBooks', () => ({
  useSellerBooks: () => ({
    sellerBooks: mockSellerBooks,
    saveBook: mockSaveBook,
    withdrawBook: mockWithdrawBook,
  }),
}));

vi.mock('@/features/seller/useSellerOrders', () => ({
  useSellerOrders: () => ({
    orders: INITIAL_ORDERS,
    isLoading: false,
  }),
}));

describe('SellerDashboard - RF-29 / RF-30', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSellerId = 'user_seller_1';
  });

  it('CA-2: displays sales figures matching demo orders for user_seller_1 ($32.50, 2 u.)', () => {
    render(<SellerDashboard />);

    const revenueEl = screen.getByTestId('stat-revenue');
    const salesCountEl = screen.getByTestId('stat-sales-count');

    expect(revenueEl).toHaveTextContent('$32.50');
    expect(salesCountEl).toHaveTextContent('2 u.');

    // Detail table rendered with demo items
    const salesTable = screen.getByTestId('sales-table');
    expect(salesTable).toBeInTheDocument();
    expect(within(salesTable).getByText('Cien años de soledad')).toBeInTheDocument();
    expect(within(salesTable).getByText('Ficciones')).toBeInTheDocument();
  });

  it('CA-1: allows seller to withdraw a published book from sale', () => {
    render(<SellerDashboard />);

    const withdrawBtn = screen.getByTestId('withdraw-book-book_1');
    expect(withdrawBtn).toBeInTheDocument();

    fireEvent.click(withdrawBtn);
    expect(mockWithdrawBook).toHaveBeenCalledWith('book_1');
  });

  it('does not render withdraw button for draft books', () => {
    render(<SellerDashboard />);

    expect(screen.queryByTestId('withdraw-book-book_draft_1')).not.toBeInTheDocument();
  });

  it('filters statistics and sales table when selecting a custom date range', () => {
    render(<SellerDashboard />);

    const startDateInput = screen.getByTestId('filter-start-date');
    const endDateInput = screen.getByTestId('filter-end-date');

    // Filter to an empty period (outside 2025)
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('stat-sales-count')).toHaveTextContent('0 u.');
    expect(screen.queryByTestId('sales-table')).not.toBeInTheDocument();
    expect(screen.getByText(/No se registraron ventas pagadas/i)).toBeInTheDocument();

    // Click "Limpiar" to reset
    const clearBtn = screen.getByTestId('filter-clear-btn');
    fireEvent.click(clearBtn);

    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$32.50');
    expect(screen.getByTestId('stat-sales-count')).toHaveTextContent('2 u.');
  });

  it('allows clicking demo period shortcut button (Febrero 2025)', () => {
    render(<SellerDashboard />);

    const demoBtn = screen.getByRole('button', { name: /Ver período demo/i });
    fireEvent.click(demoBtn);

    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$32.50');
    expect(screen.getByTestId('stat-sales-count')).toHaveTextContent('2 u.');
  });

  it('CA-3: shows 0 sales for a seller with no sales in demo orders', () => {
    currentSellerId = 'user_seller_without_orders';
    render(<SellerDashboard />);

    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('stat-sales-count')).toHaveTextContent('0 u.');
  });
});
