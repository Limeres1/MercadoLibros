import React from 'react';
import { Link } from 'react-router';
import { BookX } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ROUTES } from '@/constants/routes';

export const NotFoundPage: React.FC = () => (
  <EmptyState
    icon={BookX}
    title="Página no encontrada (404)"
    description="La dirección que buscás no existe o fue movida."
    action={
      <Link
        to={ROUTES.home}
        className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
      >
        Ir al catálogo
      </Link>
    }
  />
);
