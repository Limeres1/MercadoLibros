import React, { useId, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Calendar, Loader2, Receipt } from 'lucide-react';

import {
  calculateSellerStats,
  periodRange,
  rangeError,
  SALES_PERIOD_LABELS,
  SALES_PERIODS,
  SalesPeriod,
} from '@/features/seller/sellerStats';
import { formatDate, formatPrice } from '@/lib/format';
import { Book, Order } from '@/types';

interface SalesStatsProps {
  sellerId: string;
  orders: Order[];
  books: Book[];
  isLoading: boolean;
  error: string | null;
}

const PRESET_PERIODS = Object.keys(SALES_PERIOD_LABELS) as Exclude<SalesPeriod, 'custom'>[];

const DATE_INPUT_CLASS =
  'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500';

export const SalesStats: React.FC<SalesStatsProps> = ({ sellerId, orders, books, isLoading, error }) => {
  const fieldId = useId();
  const [period, setPeriod] = useState<SalesPeriod>(SALES_PERIODS.all);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dateError = period === SALES_PERIODS.custom ? rangeError(startDate, endDate) : null;
  const stats = useMemo(
    () => calculateSellerStats(orders, sellerId, periodRange(period, startDate, endDate)),
    [orders, sellerId, period, startDate, endDate],
  );

  const selectPreset = (preset: SalesPeriod) => {
    setPeriod(preset);
    setStartDate('');
    setEndDate('');
  };

  const changeDate = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPeriod(SALES_PERIODS.custom);
  };

  const cards = [
    { label: 'Ingresos', value: formatPrice(stats.revenue), hint: 'Sin costo de envío', testId: 'stat-revenue' },
    {
      label: 'Ejemplares vendidos',
      value: String(stats.salesCount),
      hint: `En ${stats.orderCount} ${stats.orderCount === 1 ? 'pedido pagado' : 'pedidos pagados'}`,
      testId: 'stat-sales-count',
    },
    {
      label: 'En el catálogo',
      value: String(books.filter(book => book.status === 'published').length),
      hint: 'Libros publicados',
      testId: 'stat-published-count',
    },
    {
      label: 'En revisión',
      value: String(books.filter(book => book.status === 'pending_review').length),
      hint: 'Esperan al administrador',
      testId: 'stat-pending-count',
    },
  ];

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id={`${fieldId}-title`} className="flex items-center gap-2 text-base font-bold text-slate-900">
            <BarChart3 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            Ventas
          </h2>
          <p className="mt-1 text-xs text-slate-500">Calculadas con tus pedidos pagados del período elegido.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Período" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            {PRESET_PERIODS.map(preset => (
              <button
                key={preset}
                type="button"
                aria-pressed={period === preset}
                onClick={() => selectPreset(preset)}
                className="rounded-lg px-3 py-1 font-semibold text-slate-500 transition-colors hover:text-slate-900 aria-pressed:bg-white aria-pressed:text-emerald-800 aria-pressed:shadow-2xs"
              >
                {SALES_PERIOD_LABELS[preset]}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Rango de fechas"
            className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
              period === SALES_PERIODS.custom ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor={`${fieldId}-from`} className="font-medium text-slate-500">
              Desde
            </label>
            <input
              id={`${fieldId}-from`}
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={event => changeDate(setStartDate, event.target.value)}
              className={DATE_INPUT_CLASS}
            />
            <label htmlFor={`${fieldId}-to`} className="font-medium text-slate-500">
              Hasta
            </label>
            <input
              id={`${fieldId}-to`}
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={event => changeDate(setEndDate, event.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {dateError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {dateError}
        </p>
      )}

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isLoading}>
            {cards.map(card => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <dt className="text-[11px] font-semibold text-slate-500">{card.label}</dt>
                <dd data-testid={card.testId} className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                  {isLoading ? <span className="text-slate-300">—</span> : card.value}
                </dd>
                <dd className="text-[11px] text-slate-500">{card.hint}</dd>
              </div>
            ))}
          </dl>

          {isLoading ? (
            <p className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando tus ventas…
            </p>
          ) : stats.sales.length === 0 ? (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500">
              {orders.length === 0
                ? 'Todavía no tenés ventas. Cuando alguien pague un libro tuyo, aparece acá.'
                : 'No hay ventas pagadas en este período. Probá con otro rango de fechas.'}
            </p>
          ) : (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                <Receipt className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Detalle ({stats.sales.length} {stats.sales.length === 1 ? 'línea' : 'líneas'})
              </h3>
              <div className="max-h-96 overflow-auto rounded-2xl border border-slate-100">
                <table data-testid="sales-table" className="w-full text-left text-xs text-slate-600">
                  <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Fecha de pago</th>
                      <th className="px-4 py-2.5">Pedido</th>
                      <th className="px-4 py-2.5">Libro</th>
                      <th className="px-4 py-2.5">Comprador</th>
                      <th className="px-4 py-2.5 text-center">Cant.</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stats.sales.map(sale => (
                      <tr key={`${sale.orderId}-${sale.bookId}`}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                          {formatDate(sale.paidAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{sale.orderId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{sale.title}</td>
                        <td className="px-4 py-3">{sale.buyerName}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{sale.quantity}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                          {formatPrice(sale.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
