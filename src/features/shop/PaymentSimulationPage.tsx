import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, FlaskConical, Loader2, XCircle } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { API_ROUTES } from '@/constants/api';
import { ORDER_PARAM, paths } from '@/constants/routes';
import { useOrders } from '@/features/shop/OrdersProvider';
import { formatPrice } from '@/lib/format';
import { API_ERRORS, ApiError, postApi } from '@/services/api';

type Outcome = 'approved' | 'rejected';

export const PaymentSimulationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get(ORDER_PARAM) ?? '';
  const { orders } = useOrders();
  const navigate = useNavigate();
  const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const order = orders.find(candidate => candidate.id === orderId);

  const pay = async (outcome: Outcome) => {
    setPendingOutcome(outcome);
    setError(null);
    try {
      await postApi(API_ROUTES.paymentSimulate, { orderId, outcome });
      navigate(paths.order(orderId), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : API_ERRORS.unknown);
      setPendingOutcome(null);
    }
  };

  if (!orderId) {
    return <EmptyState icon={FlaskConical} title="No hay ningún pago para simular" />;
  }

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-sky-100 p-2 text-sky-700">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Pago de prueba</h1>
          <p className="text-sm text-slate-500">Mercado Pago no está configurado en este entorno.</p>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        Elegí el resultado del pago{order ? ` de ${formatPrice(order.totalAmount)}` : ''}. El pedido pasa por los mismos
        estados que con Mercado Pago.
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => pay('approved')}
          disabled={pendingOutcome !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pendingOutcome === 'approved' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          Aprobar pago
        </button>
        <button
          type="button"
          onClick={() => pay('rejected')}
          disabled={pendingOutcome !== null}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pendingOutcome === 'rejected' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden="true" />
          )}
          Rechazar pago
        </button>
      </div>
    </div>
  );
};
