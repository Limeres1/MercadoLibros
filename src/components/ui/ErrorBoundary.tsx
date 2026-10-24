import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ROUTES } from '../../constants/routes';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16">
          <EmptyState
            icon={AlertTriangle}
            title="Algo salió mal"
            description="Ocurrió un error al mostrar esta pantalla. Volvé al inicio e intentá de nuevo."
            action={
              <a
                href={ROUTES.home}
                className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Volver al inicio
              </a>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
