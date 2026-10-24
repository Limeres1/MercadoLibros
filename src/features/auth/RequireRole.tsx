import React from 'react';
import { Link } from 'react-router';
import { Lock, ShieldX } from 'lucide-react';
import { UserRole } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { useSession } from './SessionProvider';
import { useAuthModal } from './AuthModalProvider';
import { ROUTES } from '../../constants/routes';

interface RequireRoleProps {
  roles?: Exclude<UserRole, 'visitor'>[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { currentUser } = useSession();
  const { openAuth } = useAuthModal();

  if (!currentUser) {
    return (
      <EmptyState
        icon={Lock}
        title="Necesitás iniciar sesión"
        description="Ingresá con tu cuenta para ver esta sección."
        action={
          <button
            onClick={() => openAuth('login')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Ingresar
          </button>
        }
      />
    );
  }

  if (roles && !roles.includes(currentUser.role as Exclude<UserRole, 'visitor'>)) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Acceso denegado (403)"
        description="Tu cuenta no tiene permisos para ver esta sección."
        action={
          <Link
            to={ROUTES.home}
            className="inline-block px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Volver al catálogo
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
};
