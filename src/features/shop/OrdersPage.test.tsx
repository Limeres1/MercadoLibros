import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDER_PARAM, ROUTES } from '@/constants/routes';
import { OrdersPage } from '@/features/shop/OrdersPage';
import { Order } from '@/types';

const fake = vi.hoisted(() => ({ orders: [] as Order[], postApi: vi.fn() }));

vi.mock('@/features/shop/OrdersProvider', () => ({ useOrders: () => ({ orders: fake.orders, isLoading: false }) }));
vi.mock('@/services/api', () => ({
  postApi: fake.postApi,
  ApiError: class extends Error {},
  API_ERRORS: { unknown: 'Error' },
}));

const order = (id: string, status: Order['status']): Order => ({
  id,
  buyerId: 'buyer',
  buyerName: 'Lev',
  buyerEmail: 'lev@test.com',
  items: [
    {
      bookId: 'viejo',
      sellerId: 'seller',
      title: 'El viejo y el mar',
      author: 'Ernest Hemingway',
      price: 22.02,
      quantity: 1,
      coverUrl: '',
      condition: 'nuevo',
    },
  ],
  sellerIds: ['seller'],
  subtotal: 22.02,
  shippingCost: 4.5,
  totalAmount: 26.52,
  paymentMethod: 'Mercado Pago',
  status,
  checkoutUrl: 'https://mercadopago.test/checkout',
  createdAt: '2026-11-01T22:00:00.000Z',
});

const renderPage = (path: string = ROUTES.orders) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OrdersPage />
    </MemoryRouter>,
  );

describe('OrdersPage', () => {
  beforeEach(() => {
    fake.postApi.mockResolvedValue({ status: 'cancelled' });
    fake.orders = [order('paid0001', 'paid'), order('cancel01', 'cancelled'), order('cancel02', 'cancelled')];
  });

  it('does not list abandoned payment attempts', () => {
    renderPage();
    expect(screen.getByText('1 pedido')).toBeInTheDocument();
    expect(screen.queryByText('#cancel01')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pagar' })).not.toBeInTheDocument();
  });

  it('explains that an old payment link is no longer active', async () => {
    renderPage(`${ROUTES.orders}?${ORDER_PARAM}=cancel01`);
    expect(await screen.findByText('Este intento de pago ya no está activo')).toBeInTheDocument();
    expect(screen.getByText(/No se cobró nada en este/)).toBeInTheDocument();
  });
});
