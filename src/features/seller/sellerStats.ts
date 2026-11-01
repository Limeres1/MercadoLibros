import { Order } from '@/types';

export type PeriodType = '7d' | 'month' | 'year' | 'all' | 'custom';

export interface DateRangeOptions {
  period?: PeriodType;
  startDate?: string | null; // Format: 'YYYY-MM-DD'
  endDate?: string | null; // Format: 'YYYY-MM-DD'
  now?: Date;
}

export interface SellerSaleItem {
  orderId: string;
  paidAt: string;
  bookId: string;
  title: string;
  quantity: number;
  price: number;
  subtotal: number;
  condition: string;
  buyerName?: string;
  paymentMethod?: string;
}

export interface SellerStatsResult {
  salesCount: number;
  revenue: number;
  sales: SellerSaleItem[];
}

function parseDateBoundary(dateStr: string, isEnd: boolean): number {
  if (dateStr.includes('T')) {
    return new Date(dateStr).getTime();
  }
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && parts.every(num => !Number.isNaN(num))) {
    const [year, month, day] = parts;
    return isEnd
      ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).getTime()
      : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).getTime();
  }
  const date = new Date(dateStr);
  return date.getTime();
}

export function isOrderInDateRange(order: Order, options: DateRangeOptions): boolean {
  if (order.status !== 'paid') return false;

  const { period = 'all', startDate, endDate, now = new Date() } = options;

  if (period === 'all' && !startDate && !endDate) {
    return true;
  }

  const orderTimeStr = order.paidAt || order.createdAt;
  if (!orderTimeStr) return false;
  const orderTime = new Date(orderTimeStr).getTime();
  if (Number.isNaN(orderTime)) return false;

  if (startDate || endDate || period === 'custom') {
    if (startDate) {
      const startTime = parseDateBoundary(startDate, false);
      if (orderTime < startTime) return false;
    }
    if (endDate) {
      const endTime = parseDateBoundary(endDate, true);
      if (orderTime > endTime) return false;
    }
    return true;
  }

  if (period === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return orderTime >= start.getTime() && orderTime <= now.getTime();
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return orderTime >= start.getTime() && orderTime <= end.getTime();
  }

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return orderTime >= start.getTime() && orderTime <= end.getTime();
  }

  return true;
}

export function calculateSellerStats(
  orders: Order[],
  sellerId: string,
  options: DateRangeOptions = { period: 'all' },
): SellerStatsResult {
  let salesCount = 0;
  let revenue = 0;
  const sales: SellerSaleItem[] = [];

  if (!sellerId || !Array.isArray(orders)) {
    return { salesCount: 0, revenue: 0, sales: [] };
  }

  const eligibleOrders = orders.filter(order => isOrderInDateRange(order, options));

  for (const order of eligibleOrders) {
    if (!Array.isArray(order.items)) continue;

    for (const item of order.items) {
      if (item.sellerId === sellerId) {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const subtotal = Number((price * qty).toFixed(2));

        salesCount += qty;
        revenue += subtotal;

        sales.push({
          orderId: order.id,
          paidAt: order.paidAt || order.createdAt,
          bookId: item.bookId,
          title: item.title,
          quantity: qty,
          price,
          subtotal,
          condition: item.condition,
          buyerName: order.buyerName,
          paymentMethod: order.paymentMethod,
        });
      }
    }
  }

  return {
    salesCount,
    revenue: Number(revenue.toFixed(2)),
    sales: sales.sort((first, second) => second.paidAt.localeCompare(first.paidAt)),
  };
}
