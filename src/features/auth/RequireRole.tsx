import React from 'react';
import { Link } from 'react-router';
import { Lock, ShieldX } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ROUTES } from '@/constants/routes';
import { useAuthModal } from '@/features/auth/AuthModalProvider';
import { useSession } from '@/features/auth/SessionProvider';
import { AccountRole } from '@/types';

interface RequireRoleProps {
  roles?: AccountRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { currentUser, isAuthLoading } = useSession();
  const { openAuth } = useAuthModal();

  if (isAuthLoading) return <PageLoader />;

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

  if (roles && !roles.includes(currentUser.role)) {
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
