import { describe, expect, it } from 'vitest';

import { INITIAL_ORDERS } from '@/data/initialData';
import { calculateSellerStats, isOrderInDateRange } from '@/features/seller/sellerStats';
import { Order } from '@/types';

describe('sellerStats - RF-29 / RF-30', () => {
  describe('CA-2: Las cifras coinciden con los pedidos demo del período elegido', () => {
    it('calculates exact demo sales and revenue for user_seller_1 in "all" period', () => {
      // Demo order ORD-98421: book_1 ($18.5) + book_2 ($14.0) = $32.50, 2 units
      const stats = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', { period: 'all' });

      expect(stats.salesCount).toBe(2);
      expect(stats.revenue).toBe(32.5);
      expect(stats.sales).toHaveLength(2);
      expect(stats.sales[0].orderId).toBe('ORD-98421');
    });

    it('calculates exact demo sales and revenue for user_seller_2 in "all" period', () => {
      // Demo order ORD-76190: book_6 ($9.5) = $9.50, 1 unit
      const stats = calculateSellerStats(INITIAL_ORDERS, 'user_seller_2', { period: 'all' });

      expect(stats.salesCount).toBe(1);
      expect(stats.revenue).toBe(9.5);
      expect(stats.sales).toHaveLength(1);
      expect(stats.sales[0].orderId).toBe('ORD-76190');
      expect(stats.sales[0].title).toBe('El principito');
    });

    it('filters correctly by custom date range covering February 2025', () => {
      const statsSeller1 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      });
      expect(statsSeller1.salesCount).toBe(2);
      expect(statsSeller1.revenue).toBe(32.5);

      const statsSeller2 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_2', {
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      });
      expect(statsSeller2.salesCount).toBe(1);
      expect(statsSeller2.revenue).toBe(9.5);
    });

    it('filters orders by sub-ranges of February 2025', () => {
      // ORD-98421 occurred on 2025-02-08, ORD-76190 on 2025-02-22
      const firstHalfSeller1 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        startDate: '2025-02-01',
        endDate: '2025-02-15',
      });
      expect(firstHalfSeller1.salesCount).toBe(2);
      expect(firstHalfSeller1.revenue).toBe(32.5);

      const firstHalfSeller2 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_2', {
        startDate: '2025-02-01',
        endDate: '2025-02-15',
      });
      expect(firstHalfSeller2.salesCount).toBe(0);
      expect(firstHalfSeller2.revenue).toBe(0);

      const secondHalfSeller1 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        startDate: '2025-02-16',
        endDate: '2025-02-28',
      });
      expect(secondHalfSeller1.salesCount).toBe(0);
      expect(secondHalfSeller1.revenue).toBe(0);

      const secondHalfSeller2 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_2', {
        startDate: '2025-02-16',
        endDate: '2025-02-28',
      });
      expect(secondHalfSeller2.salesCount).toBe(1);
      expect(secondHalfSeller2.revenue).toBe(9.5);
    });

    it('returns zero sales and revenue for a date range outside demo orders', () => {
      const stats = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(stats.salesCount).toBe(0);
      expect(stats.revenue).toBe(0);
      expect(stats.sales).toHaveLength(0);
    });

    it('supports presets with a custom reference now date', () => {
      const refDate = new Date('2025-02-25T12:00:00Z');

      // Month preset for Feb 2025
      const statsMonth = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        period: 'month',
        now: refDate,
      });
      expect(statsMonth.salesCount).toBe(2);
      expect(statsMonth.revenue).toBe(32.5);

      // 7d preset from 2025-02-25 (covers 2025-02-18 to 2025-02-25)
      // ORD-98421 (Feb 8) is outside 7 days; ORD-76190 (Feb 22) is for seller 2
      const stats7dSeller1 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', {
        period: '7d',
        now: refDate,
      });
      expect(stats7dSeller1.salesCount).toBe(0);

      const stats7dSeller2 = calculateSellerStats(INITIAL_ORDERS, 'user_seller_2', {
        period: '7d',
        now: refDate,
      });
      expect(stats7dSeller2.salesCount).toBe(1);
      expect(stats7dSeller2.revenue).toBe(9.5);
    });

    it('ignores non-paid orders (e.g. pending or rejected)', () => {
      const ordersWithPending: Order[] = [
        ...INITIAL_ORDERS,
        {
          id: 'ORD-PENDING',
          buyerId: 'user_buyer_1',
          buyerName: 'Sofía',
          buyerEmail: 'sofia@test.com',
          sellerIds: ['user_seller_1'],
          subtotal: 50,
          shippingCost: 5,
          totalAmount: 55,
          paymentMethod: 'Mercado Pago',
          status: 'pending',
          createdAt: '2025-02-10T10:00:00Z',
          items: [
            {
              bookId: 'book_1',
              sellerId: 'user_seller_1',
              title: 'Cien años de soledad',
              author: 'GGM',
              price: 50,
              quantity: 1,
              coverUrl: '',
              condition: 'nuevo',
            },
          ],
        },
      ];

      const stats = calculateSellerStats(ordersWithPending, 'user_seller_1', { period: 'all' });
      // Should still be exactly 2 items, $32.50
      expect(stats.salesCount).toBe(2);
      expect(stats.revenue).toBe(32.5);
    });

    it('does not include shipping costs in seller book revenue', () => {
      // ORD-98421 has totalAmount 37.0 (subtotal 32.5 + shippingCost 4.5)
      const stats = calculateSellerStats(INITIAL_ORDERS, 'user_seller_1', { period: 'all' });
      expect(stats.revenue).toBe(32.5); // NOT 37.0
    });
  });

  describe('CA-3: Un vendedor sólo ve sus propios libros y ventas', () => {
    it('isolates seller revenue and sales when orders contain items from multiple sellers', () => {
      const multiSellerOrder: Order = {
        id: 'ORD-MULTI',
        buyerId: 'user_buyer_1',
        buyerName: 'Sofía',
        buyerEmail: 'sofia@test.com',
        sellerIds: ['seller_alpha', 'seller_beta'],
        subtotal: 80,
        shippingCost: 0,
        totalAmount: 80,
        paymentMethod: 'Tarjeta',
        status: 'paid',
        createdAt: '2025-03-01T10:00:00Z',
        paidAt: '2025-03-01T10:05:00Z',
        items: [
          {
            bookId: 'b_alpha_1',
            sellerId: 'seller_alpha',
            title: 'Libro de Alpha',
            author: 'Alpha',
            price: 30,
            quantity: 2, // 2 * 30 = 60
            coverUrl: '',
            condition: 'nuevo',
          },
          {
            bookId: 'b_beta_1',
            sellerId: 'seller_beta',
            title: 'Libro de Beta',
            author: 'Beta',
            price: 20,
            quantity: 1, // 1 * 20 = 20
            coverUrl: '',
            condition: 'digital',
          },
        ],
      };

      const alphaStats = calculateSellerStats([multiSellerOrder], 'seller_alpha', { period: 'all' });
      expect(alphaStats.salesCount).toBe(2);
      expect(alphaStats.revenue).toBe(60);
      expect(alphaStats.sales).toHaveLength(1);
      expect(alphaStats.sales[0].title).toBe('Libro de Alpha');

      const betaStats = calculateSellerStats([multiSellerOrder], 'seller_beta', { period: 'all' });
      expect(betaStats.salesCount).toBe(1);
      expect(betaStats.revenue).toBe(20);
      expect(betaStats.sales).toHaveLength(1);
      expect(betaStats.sales[0].title).toBe('Libro de Beta');

      const gammaStats = calculateSellerStats([multiSellerOrder], 'seller_gamma', { period: 'all' });
      expect(gammaStats.salesCount).toBe(0);
      expect(gammaStats.revenue).toBe(0);
      expect(gammaStats.sales).toHaveLength(0);
    });

    it('returns zero for sellers who have no orders or are not in demo orders', () => {
      const stats = calculateSellerStats(INITIAL_ORDERS, 'seller_without_orders', { period: 'all' });
      expect(stats.salesCount).toBe(0);
      expect(stats.revenue).toBe(0);
      expect(stats.sales).toEqual([]);
    });

    it('handles invalid or empty inputs gracefully', () => {
      expect(calculateSellerStats([], 'user_seller_1')).toEqual({ salesCount: 0, revenue: 0, sales: [] });
      expect(calculateSellerStats(null as unknown as Order[], 'user_seller_1')).toEqual({
        salesCount: 0,
        revenue: 0,
        sales: [],
      });
      expect(calculateSellerStats(INITIAL_ORDERS, '')).toEqual({ salesCount: 0, revenue: 0, sales: [] });
    });
  });

  describe('isOrderInDateRange helper', () => {
    const paidOrder = INITIAL_ORDERS[0]; // 2025-02-08

    it('returns false if order status is not paid', () => {
      expect(isOrderInDateRange({ ...paidOrder, status: 'pending' }, { period: 'all' })).toBe(false);
      expect(isOrderInDateRange({ ...paidOrder, status: 'rejected' }, { period: 'all' })).toBe(false);
    });

    it('matches all paid orders when period is all and no dates provided', () => {
      expect(isOrderInDateRange(paidOrder, { period: 'all' })).toBe(true);
    });
  });
});
