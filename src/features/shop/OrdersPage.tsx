import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { API_ROUTES } from '@/constants/api';
import { ORDER_PARAM, ROUTES } from '@/constants/routes';
import { BOOK_CONDITION_LABELS } from '@/constants/statuses';
import { useOrders } from '@/features/shop/OrdersProvider';
import { formatDate, formatPrice } from '@/lib/format';
import { API_ERRORS, ApiError, postApi } from '@/services/api';
import { Order, OrderStatus } from '@/types';

const STATUS_BADGES: Record<OrderStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  paid: { label: 'Pagado', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  pending: { label: 'Pendiente de pago', className: 'bg-amber-100 text-amber-900', icon: Clock },
  rejected: { label: 'Pago rechazado', className: 'bg-red-100 text-red-800', icon: XCircle },
};

const RESULT_MESSAGES: Record<OrderStatus, { title: string; text: string; className: string }> = {
  paid: {
    title: '¡Pago aprobado!',
    text: 'Tus libros digitales ya están en tu biblioteca. Los impresos se envían a la dirección indicada.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  pending: {
    title: 'Tu pago está pendiente',
    text: 'Mercado Pago todavía no lo confirmó. Podés verificarlo de nuevo en unos minutos.',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  rejected: {
    title: 'El pago fue rechazado',
    text: 'No se cobró nada y los libros siguen en tu carrito. Podés intentar de nuevo con otro medio de pago.',
    className: 'border-red-200 bg-red-50 text-red-900',
  },
};

export const OrdersPage: React.FC = () => {
  const { orders, isLoading } = useOrders();
  const [searchParams] = useSearchParams();
  const returnedOrderId = searchParams.get(ORDER_PARAM);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncedRef = useRef<string | null>(null);

  const syncPayment = async (orderId: string) => {
    setSyncingOrderId(orderId);
    setSyncError(null);
    try {
      await postApi<{ status: OrderStatus }>(API_ROUTES.paymentSync, { orderId });
    } catch (caught) {
      setSyncError(caught instanceof ApiError ? caught.message : API_ERRORS.unknown);
    } finally {
      setSyncingOrderId(null);
    }
  };

  useEffect(() => {
    if (!returnedOrderId || syncedRef.current === returnedOrderId) return;
    syncedRef.current = returnedOrderId;
    syncPayment(returnedOrderId);
  }, [returnedOrderId]);

  if (isLoading && orders.length === 0) return <PageLoader />;

  const returnedOrder = orders.find(order => order.id === returnedOrderId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-bold text-slate-900">Mis pedidos</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
        </p>
      </header>

      {returnedOrder && (
        <div role="status" className={`rounded-xl border px-4 py-3 ${RESULT_MESSAGES[returnedOrder.status].className}`}>
          <p className="font-semibold">
            {syncingOrderId === returnedOrder.id ? 'Confirmando tu pago…' : RESULT_MESSAGES[returnedOrder.status].title}
          </p>
          {syncingOrderId !== returnedOrder.id && (
            <p className="text-sm">{RESULT_MESSAGES[returnedOrder.status].text}</p>
          )}
        </div>
      )}

      {syncError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {syncError}
        </p>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Todavía no hiciste ningún pedido"
          description="Cuando compres tus primeros libros, vas a ver acá el estado de cada pago."
          action={
            <Link
              to={ROUTES.home}
              className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Explorar el catálogo
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isHighlighted={order.id === returnedOrderId}
              isSyncing={syncingOrderId === order.id}
              onSync={() => syncPayment(order.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  isHighlighted: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, isHighlighted, isSyncing, onSync }) => {
  const badge = STATUS_BADGES[order.status];
  const BadgeIcon = badge.icon;
  const hasDigital = order.items.some(item => item.condition === 'digital');

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-white ${isHighlighted ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-200'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-slate-900">Pedido del {formatDate(order.createdAt)}</p>
          <p className="font-mono text-xs text-slate-500">#{order.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold tabular-nums text-slate-900">{formatPrice(order.totalAmount)}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
          >
            <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 px-4">
        {order.items.map(item => (
          <li key={item.bookId} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={item.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {item.author} · {BOOK_CONDITION_LABELS[item.condition]}
                  {item.quantity > 1 && ` · ${item.quantity} ejemplares`}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-slate-800">
              {formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {order.paymentMethod}
          </span>
          {order.shippingAddress && (
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {order.shippingAddress}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'paid' && hasDigital && (
            <Link
              to={ROUTES.library}
              className="flex items-center gap-1.5 font-semibold text-amber-700 hover:underline"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Leer en mi biblioteca
            </Link>
          )}
          {order.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Verificar pago
              </button>
              {order.checkoutUrl && (
                <a
                  href={order.checkoutUrl}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700"
                >
                  Pagar
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
};
