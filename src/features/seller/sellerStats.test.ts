import { describe, expect, it } from 'vitest';

import { calculateSellerStats, periodRange, rangeError, SALES_PERIODS } from '@/features/seller/sellerStats';
import { Order, OrderItem } from '@/types';
import { salesOfSeller } from '@api/_lib/sellerSales';

const item = (sellerId: string, price: number, quantity = 1, bookId = `${sellerId}-${price}`): OrderItem => ({
  bookId,
  title: `Libro ${bookId}`,
  author: 'Autor',
  sellerId,
  price,
  quantity,
  coverUrl: '',
  condition: 'nuevo',
});

const order = (id: string, paidAt: string, items: OrderItem[], status: Order['status'] = 'paid'): Order => ({
  id,
  buyerId: 'buyer',
  buyerName: 'Renata',
  buyerEmail: 'renata@test.com',
  items,
  sellerIds: [...new Set(items.map(line => line.sellerId))],
  subtotal: 0,
  shippingCost: 0,
  totalAmount: 0,
  paymentMethod: 'Mercado Pago',
  status,
  createdAt: paidAt,
  ...(status === 'paid' ? { paidAt } : {}),
});

const ORDERS = [
  order('ord_1', new Date(2026, 9, 31, 23, 30).toISOString(), [item('me', 10.1, 2), item('other', 99)]),
  order('ord_2', new Date(2026, 10, 1, 0, 15).toISOString(), [item('me', 0.2), item('me', 0.1, 1, 'second')]),
  order('ord_3', new Date(2026, 10, 1, 9).toISOString(), [item('me', 50)], 'pending'),
  order('ord_4', new Date(2025, 5, 10).toISOString(), [item('other', 20)]),
  order('ord_5', new Date(2025, 5, 11).toISOString(), [item('me', 7.5, 3)]),
];

const NOW = new Date(2026, 10, 1, 12);
const MY_SALES = salesOfSeller(ORDERS, 'me');

describe('sellerStats', () => {
  it('CA-2/CA-3: counts only paid lines of this seller, in exact cents', () => {
    const stats = calculateSellerStats(MY_SALES, periodRange(SALES_PERIODS.all));
    expect(stats.salesCount).toBe(7);
    expect(stats.orderCount).toBe(3);
    expect(stats.revenue).toBe(43);
    expect(stats.sales.map(sale => sale.orderId)).toEqual(['ord_2', 'ord_2', 'ord_1', 'ord_5']);
    expect(stats.sales.every(sale => !sale.title.includes('other'))).toBe(true);
  });

  it('uses local calendar boundaries for this month and this year', () => {
    const month = calculateSellerStats(MY_SALES, periodRange(SALES_PERIODS.month, '', '', NOW));
    expect(month).toMatchObject({ salesCount: 2, revenue: 0.3 });
    const year = calculateSellerStats(MY_SALES, periodRange(SALES_PERIODS.year, '', '', NOW));
    expect(year).toMatchObject({ salesCount: 4, revenue: 20.5 });
    const week = calculateSellerStats(MY_SALES, periodRange(SALES_PERIODS.last7Days, '', '', NOW));
    expect(week.salesCount).toBe(4);
  });

  it('includes the whole end day of a custom range and allows open ends', () => {
    const lastDay = periodRange(SALES_PERIODS.custom, '2026-10-31', '2026-10-31');
    expect(calculateSellerStats(MY_SALES, lastDay)).toMatchObject({ salesCount: 2, revenue: 20.2 });
    const since = periodRange(SALES_PERIODS.custom, '2026-01-01', '');
    expect(calculateSellerStats(MY_SALES, since).salesCount).toBe(4);
    const until = periodRange(SALES_PERIODS.custom, '', '2025-12-31');
    expect(calculateSellerStats(MY_SALES, until)).toMatchObject({ salesCount: 3, revenue: 22.5 });
  });

  it('reports an inverted range', () => {
    expect(rangeError('2026-11-02', '2026-11-01')).toContain('posterior');
    expect(rangeError('2026-11-01', '2026-11-01')).toBeNull();
    expect(rangeError('', '2026-11-01')).toBeNull();
  });

  it('returns zeros for a seller without sales', () => {
    expect(calculateSellerStats(salesOfSeller(ORDERS, 'nobody'), periodRange(SALES_PERIODS.all))).toEqual({
      salesCount: 0,
      orderCount: 0,
      revenue: 0,
      sales: [],
    });
  });
});
