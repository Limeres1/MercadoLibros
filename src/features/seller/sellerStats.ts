import { Order } from '@/types';

export const SALES_PERIODS = {
  all: 'all',
  year: 'year',
  month: 'month',
  last7Days: 'last7Days',
  custom: 'custom',
} as const;

export type SalesPeriod = (typeof SALES_PERIODS)[keyof typeof SALES_PERIODS];

export const SALES_PERIOD_LABELS: Record<Exclude<SalesPeriod, 'custom'>, string> = {
  [SALES_PERIODS.all]: 'Todo',
  [SALES_PERIODS.year]: 'Este año',
  [SALES_PERIODS.month]: 'Este mes',
  [SALES_PERIODS.last7Days]: 'Últimos 7 días',
};

export interface DateRange {
  from: number | null;
  to: number | null;
}

export interface SellerSale {
  orderId: string;
  paidAt: string;
  bookId: string;
  title: string;
  quantity: number;
  price: number;
  subtotal: number;
  buyerName: string;
}

export interface SellerStats {
  salesCount: number;
  orderCount: number;
  revenue: number;
  sales: SellerSale[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  return new Date(year, month - 1, day).getTime();
};

export function rangeError(startDate: string, endDate: string) {
  const from = parseLocalDate(startDate);
  const to = parseLocalDate(endDate);
  return from !== null && to !== null && from > to ? 'La fecha «desde» es posterior a la fecha «hasta».' : null;
}

export function periodRange(period: SalesPeriod, startDate = '', endDate = '', now = new Date()): DateRange {
  switch (period) {
    case SALES_PERIODS.year:
      return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: new Date(now.getFullYear() + 1, 0, 1).getTime() };
    case SALES_PERIODS.month:
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
      };
    case SALES_PERIODS.last7Days:
      return { from: now.getTime() - 7 * DAY_MS, to: now.getTime() + 1 };
    case SALES_PERIODS.custom: {
      const end = parseLocalDate(endDate);
      return {
        from: parseLocalDate(startDate),
        to: end === null ? null : new Date(end).setDate(new Date(end).getDate() + 1),
      };
    }
    default:
      return { from: null, to: null };
  }
}

const toCents = (amount: number) => Math.round(amount * 100);

export function calculateSellerStats(orders: Order[], sellerId: string, range: DateRange): SellerStats {
  const sales: SellerSale[] = [];
  const orderIds = new Set<string>();
  let revenueCents = 0;
  let salesCount = 0;

  for (const order of orders) {
    if (order.status !== 'paid' || !order.paidAt) continue;
    const paidTime = new Date(order.paidAt).getTime();
    if (Number.isNaN(paidTime)) continue;
    if (range.from !== null && paidTime < range.from) continue;
    if (range.to !== null && paidTime >= range.to) continue;

    for (const item of order.items) {
      if (item.sellerId !== sellerId) continue;
      const subtotalCents = toCents(item.price) * item.quantity;
      revenueCents += subtotalCents;
      salesCount += item.quantity;
      orderIds.add(order.id);
      sales.push({
        orderId: order.id,
        paidAt: order.paidAt,
        bookId: item.bookId,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        subtotal: subtotalCents / 100,
        buyerName: order.buyerName,
      });
    }
  }

  sales.sort((first, second) => second.paidAt.localeCompare(first.paidAt));
  return { salesCount, orderCount: orderIds.size, revenue: revenueCents / 100, sales };
}
