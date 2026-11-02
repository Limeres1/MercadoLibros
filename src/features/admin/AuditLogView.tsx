import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { paths } from '@/constants/routes';
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS } from '@/constants/statuses';
import { matchesSearch } from '@/features/admin/adminSearch';
import { EmptyRow, PANEL_CLASS, PanelHeader, SearchField, SELECT_CLASS } from '@/features/admin/AdminUi';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { firestoreRefs } from '@/services/firestore';
import { AuditAction, AuditLogEntry } from '@/types';

const AUDIT_PAGE_SIZE = 300;
const ALL = 'all';

const targetLink = (entry: AuditLogEntry) => {
  if (entry.targetType === 'book') return paths.book(entry.targetId);
  if (entry.targetType === 'user') return paths.userProfile(entry.targetId);
  return null;
};

export const AuditLogView: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<AuditAction | typeof ALL>(ALL);

  useEffect(
    () =>
      onSnapshot(
        query(firestoreRefs.auditLog(), orderBy('createdAt', 'desc'), limit(AUDIT_PAGE_SIZE)),
        { includeMetadataChanges: true },
        snapshot => {
          setEntries(snapshot.docs.map(entry => entry.data()));
          if (!snapshot.metadata.fromCache) setIsLoading(false);
        },
        caught => {
          setError(getErrorMessage(caught));
          setIsLoading(false);
        },
      ),
    [],
  );

  const results = useMemo(
    () =>
      entries
        .filter(entry => action === ALL || entry.action === action)
        .filter(entry => matchesSearch(search, [entry.adminName, entry.targetLabel, entry.targetId, entry.reason])),
    [entries, action, search],
  );

  return (
    <section className={PANEL_CLASS}>
      <PanelHeader
        title="Registro de auditoría"
        description="Cada acción de moderación con quién la hizo, cuándo y por qué. Las entradas no se pueden editar ni borrar."
      >
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchField
            label="Buscar en el registro"
            value={search}
            onChange={setSearch}
            placeholder="Admin, libro, usuario, motivo…"
          />
          <label>
            <span className="sr-only">Acción</span>
            <select
              value={action}
              onChange={event => setAction(event.target.value as AuditAction | typeof ALL)}
              className={SELECT_CLASS}
            >
              <option value={ALL}>Todas las acciones</option>
              {AUDIT_ACTIONS.map(option => (
                <option key={option} value={option}>
                  {AUDIT_ACTION_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PanelHeader>

      {error ? (
        <p role="alert" className="p-5 text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : isLoading ? (
        <p className="flex items-center justify-center gap-2 p-10 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando el registro…
        </p>
      ) : results.length === 0 ? (
        <EmptyRow>
          {entries.length === 0 ? 'Todavía no hay acciones registradas.' : 'Ninguna acción coincide.'}
        </EmptyRow>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table data-testid="audit-table" className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Fecha y hora</th>
                <th className="px-5 py-3">Administrador</th>
                <th className="px-5 py-3">Acción</th>
                <th className="px-5 py-3">Sobre</th>
                <th className="px-5 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map(entry => {
                const link = targetLink(entry);
                const label = entry.targetLabel || entry.targetId;
                return (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-5 py-3 font-medium">{entry.adminName}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{AUDIT_ACTION_LABELS[entry.action]}</td>
                    <td className="px-5 py-3">
                      {link ? (
                        <Link to={link} className="hover:underline">
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                    </td>
                    <td className="max-w-sm px-5 py-3 text-slate-600">{entry.reason || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
