import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SellerDashboard } from '@/features/seller/SellerDashboard';
import { Book, SellerSale } from '@/types';

const fake = vi.hoisted(() => ({
  withdrawBook: vi.fn(),
  saveBook: vi.fn(),
  sales: { sales: [] as SellerSale[], isLoading: false, error: null as string | null },
}));

const book = (id: string, status: Book['status']): Book => ({
  id,
  title: `Libro ${id}`,
  author: 'Autora',
  isbn: '',
  description: '',
  price: 10,
  condition: 'digital',
  genre: 'Novela',
  language: 'Español',
  coverUrl: '',
  sampleText: '',
  sellerId: 'seller-1',
  sellerName: 'Tinta Sur',
  status,
  rating: 0,
  reviewCount: 0,
  salesCount: 3,
  pages: 100,
  publicationYear: 2020,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

const sale = (orderId: string, paidAt: string, price: number): SellerSale => ({
  orderId,
  paidAt,
  bookId: `${orderId}-book`,
  title: `Vendido ${orderId}`,
  quantity: 1,
  price,
  buyerName: 'Renata Ortiz',
});

vi.mock('@/features/seller/useSellerBooks', () => ({
  useSellerBooks: () => ({
    sellerBooks: [book('published', 'published'), book('review', 'pending_review')],
    saveBook: fake.saveBook,
    withdrawBook: fake.withdrawBook,
  }),
}));
vi.mock('@/features/seller/useSellerSales', () => ({ useSellerSales: () => fake.sales }));
vi.mock('@/features/seller/CreateBookModal', () => ({ CreateBookModal: () => null }));

describe('SellerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.sales = {
      sales: [sale('ord_1', '2026-10-21T21:27:54.000Z', 20), sale('ord_2', '2026-05-02T12:00:00.000Z', 12.5)],
      isLoading: false,
      error: null,
    };
  });

  it('CA-2: shows the totals of the paid orders and filters them by date range', () => {
    render(<SellerDashboard />);
    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$32.50');
    expect(screen.getByTestId('stat-sales-count')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-published-count')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-pending-count')).toHaveTextContent('1');

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } });
    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$20.00');
    expect(within(screen.getByTestId('sales-table')).getAllByRole('row')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Todo' }));
    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$32.50');
    expect(screen.getByLabelText('Desde')).toHaveValue('');
  });

  it('explains an empty period and an inverted range', () => {
    render(<SellerDashboard />);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-02' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-01-01' } });
    expect(screen.getByRole('alert')).toHaveTextContent('posterior');
    expect(screen.getByText(/No hay ventas pagadas en este período/)).toBeInTheDocument();
  });

  it('does not invent figures while loading or when the orders cannot be read', () => {
    fake.sales = { sales: [], isLoading: true, error: null };
    const { unmount } = render(<SellerDashboard />);
    expect(screen.getByText('Cargando tus ventas…')).toBeInTheDocument();
    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('—');
    unmount();

    fake.sales = { sales: [], isLoading: false, error: 'No pudimos cargar tus ventas.' };
    render(<SellerDashboard />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus ventas.');
    expect(screen.queryByTestId('stat-revenue')).not.toBeInTheDocument();
  });

  it('shows a clear empty state for a seller without sales', () => {
    fake.sales = { sales: [], isLoading: false, error: null };
    render(<SellerDashboard />);
    expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$0.00');
    expect(screen.getByText(/Todavía no tenés ventas/)).toBeInTheDocument();
  });

  it('CA-1: withdrawing asks for confirmation and explains that buyers keep the book', async () => {
    render(<SellerDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Retirar de la venta Libro published' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Quienes ya lo compraron lo siguen teniendo en su biblioteca');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(fake.withdrawBook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retirar de la venta Libro published' }));
    await act(async () =>
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retirar de la venta' })),
    );
    expect(fake.withdrawBook).toHaveBeenCalledWith('published');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
