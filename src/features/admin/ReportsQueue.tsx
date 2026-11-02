import React, { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';

import { paths } from '@/constants/routes';
import { EmptyRow, PANEL_CLASS, PanelHeader } from '@/features/admin/AdminUi';
import { ReasonDialog } from '@/features/admin/ReasonDialog';
import { ReportResolution, useModeration } from '@/features/admin/useModeration';
import { formatDateTime } from '@/lib/format';
import { Report } from '@/types';

const HISTORY_SIZE = 20;

interface PendingAction {
  report: Report;
  resolution: ReportResolution;
}

export const ReportsQueue: React.FC<{ reports: Report[] }> = ({ reports }) => {
  const { resolveReport } = useModeration();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const pending = reports
    .filter(report => report.status === 'pending')
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  const history = reports
    .filter(report => report.status !== 'pending')
    .sort((first, second) => (second.resolvedAt ?? '').localeCompare(first.resolvedAt ?? ''))
    .slice(0, HISTORY_SIZE);

  const removeLabel = (report: Report) => (report.targetType === 'book' ? 'Retirar el libro' : 'Eliminar la reseña');

  return (
    <div className="space-y-6">
      <section className={PANEL_CLASS}>
        <PanelHeader
          title={`Denuncias pendientes (${pending.length})`}
          description="Las más antiguas primero. Cada decisión pide una nota que queda en el registro."
        />
        {pending.length === 0 ? (
          <EmptyRow>
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" aria-hidden="true" />
            No hay denuncias pendientes.
          </EmptyRow>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map(report => (
              <li key={report.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    <span
                      className={`mr-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        report.targetType === 'book' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {report.targetType === 'book' ? 'Libro' : 'Reseña'}
                    </span>
                    {report.targetType === 'book' ? (
                      <Link to={paths.book(report.targetId)} className="hover:underline">
                        {report.targetTitle}
                      </Link>
                    ) : (
                      report.targetTitle
                    )}
                  </p>
                  <span className="text-[11px] text-slate-500">{formatDateTime(report.createdAt)}</span>
                </div>
                <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-rose-700">{report.reason}</p>
                  {report.details && <p className="text-slate-700">{report.details}</p>}
                  <p className="text-[11px] text-slate-500">Denunció: {report.reporterName}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingAction({ report, resolution: 'dismiss' })}
                    className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Desestimar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction({ report, resolution: 'remove_target' })}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    {removeLabel(report)}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className={PANEL_CLASS}>
          <PanelHeader title="Últimas denuncias resueltas" description="Qué se decidió y por qué." />
          <ul className="divide-y divide-slate-100 text-xs">
            {history.map(report => (
              <li key={report.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {report.targetTitle} · <span className="font-normal text-slate-600">{report.reason}</span>
                  </p>
                  {report.adminNote && <p className="text-slate-500">{report.adminNote}</p>}
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      report.status === 'resolved' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {report.status === 'resolved' ? 'Contenido dado de baja' : 'Desestimada'}
                  </span>
                  {report.resolvedAt && (
                    <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(report.resolvedAt)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingAction && (
        <ReasonDialog
          title={
            pendingAction.resolution === 'dismiss'
              ? 'Desestimar la denuncia'
              : `${removeLabel(pendingAction.report)} denunciado`
          }
          description={
            pendingAction.resolution === 'dismiss'
              ? `El contenido «${pendingAction.report.targetTitle}» queda como está.`
              : pendingAction.report.targetType === 'book'
                ? `«${pendingAction.report.targetTitle}» deja de venderse. Quienes lo compraron lo conservan.`
                : 'La reseña se borra y la valoración del libro se recalcula. No se puede deshacer.'
          }
          label="Nota de la decisión"
          placeholder={
            pendingAction.resolution === 'dismiss'
              ? 'Ej.: revisado, no infringe las normas.'
              : 'Ej.: contenido ofensivo confirmado.'
          }
          confirmLabel={pendingAction.resolution === 'dismiss' ? 'Desestimar' : removeLabel(pendingAction.report)}
          tone={pendingAction.resolution === 'dismiss' ? 'neutral' : 'danger'}
          onConfirm={note => resolveReport(pendingAction.report, pendingAction.resolution, note)}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};
