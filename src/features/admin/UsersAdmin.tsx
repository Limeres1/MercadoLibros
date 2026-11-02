import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Ban } from 'lucide-react';

import { paths } from '@/constants/routes';
import { ACCOUNT_ROLE_LABELS, ACCOUNT_ROLES } from '@/constants/statuses';
import { matchesSearch } from '@/features/admin/adminSearch';
import { EmptyRow, PANEL_CLASS, PanelHeader, SearchField, SELECT_CLASS } from '@/features/admin/AdminUi';
import { ReasonDialog } from '@/features/admin/ReasonDialog';
import { useModeration } from '@/features/admin/useModeration';
import { UserProfile, UserRole } from '@/types';

const ALL = 'all';
const BLOCKED = 'blocked';

type RoleFilter = Exclude<UserRole, 'visitor'> | typeof ALL | typeof BLOCKED;

export const UsersAdmin: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  const { setUserBlocked } = useModeration();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoleFilter>(ALL);
  const [target, setTarget] = useState<UserProfile | null>(null);

  const results = useMemo(
    () =>
      users
        .filter(user => filter === ALL || (filter === BLOCKED ? user.isBlocked : user.role === filter))
        .filter(user => matchesSearch(search, [user.displayName, user.email, user.location]))
        .sort((first, second) => first.displayName.localeCompare(second.displayName, 'es')),
    [users, search, filter],
  );

  return (
    <section className={PANEL_CLASS}>
      <PanelHeader
        title="Usuarios"
        description="Un usuario bloqueado no puede iniciar sesión. Bloquear y desbloquear piden motivo."
      >
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchField label="Buscar usuarios" value={search} onChange={setSearch} placeholder="Nombre o email…" />
          <label>
            <span className="sr-only">Filtrar usuarios</span>
            <select
              value={filter}
              onChange={event => setFilter(event.target.value as RoleFilter)}
              className={SELECT_CLASS}
            >
              <option value={ALL}>Todos</option>
              {ACCOUNT_ROLES.map(role => (
                <option key={role} value={role}>
                  {ACCOUNT_ROLE_LABELS[role]}
                </option>
              ))}
              <option value={BLOCKED}>Bloqueados</option>
            </select>
          </label>
        </div>
      </PanelHeader>

      <p aria-live="polite" className="px-5 pt-3 text-[11px] text-slate-500">
        {results.length} de {users.length} usuarios
      </p>

      {results.length === 0 ? (
        <EmptyRow>No hay usuarios que coincidan con la búsqueda.</EmptyRow>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map(user => (
                <tr key={user.id}>
                  <td className="px-5 py-3">
                    <Link to={paths.userProfile(user.id)} className="font-bold text-slate-900 hover:underline">
                      {user.displayName}
                    </Link>
                    <p className="text-[11px] text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-5 py-3">{ACCOUNT_ROLE_LABELS[user.role]}</td>
                  <td className="px-5 py-3">
                    {user.isBlocked ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          <Ban className="h-3 w-3" aria-hidden="true" />
                          Bloqueado
                        </span>
                        {user.blockReason && (
                          <p className="mt-1 max-w-xs text-[11px] text-rose-700">{user.blockReason}</p>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {user.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => setTarget(user)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                          user.isBlocked
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <ReasonDialog
          title={target.isBlocked ? `Desbloquear a ${target.displayName}` : `Bloquear a ${target.displayName}`}
          description={
            target.isBlocked
              ? 'Va a poder iniciar sesión y usar su cuenta de nuevo.'
              : 'Se cierra su sesión y no puede volver a entrar hasta que lo desbloquees.'
          }
          label={target.isBlocked ? 'Motivo del desbloqueo' : 'Motivo del bloqueo'}
          placeholder={target.isBlocked ? 'Ej.: apelación aceptada.' : 'Ej.: publicaciones fraudulentas reiteradas.'}
          confirmLabel={target.isBlocked ? 'Desbloquear' : 'Bloquear'}
          tone={target.isBlocked ? 'neutral' : 'danger'}
          onConfirm={reason => setUserBlocked(target, !target.isBlocked, reason)}
          onClose={() => setTarget(null)}
        />
      )}
    </section>
  );
};
