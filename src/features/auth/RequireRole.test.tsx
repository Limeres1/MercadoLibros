import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_USERS } from '@/data/initialData';
import { AuthModalProvider } from '@/features/auth/AuthModalProvider';
import { RequireRole } from '@/features/auth/RequireRole';
import { SessionProvider } from '@/features/auth/SessionProvider';

vi.mock('../../services/firebase', () => ({ auth: {} }));

const renderAs = (role: 'visitor' | 'buyer' | 'admin') => {
  const user = INITIAL_USERS.find(candidate => candidate.role === role);
  if (user) localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user.id));
  render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <SessionProvider>
            <RequireRole roles={['admin']}>
              <p>panel admin</p>
            </RequireRole>
          </SessionProvider>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
};

describe('RequireRole', () => {
  it('asks a visitor to log in', () => {
    renderAs('visitor');
    expect(screen.getByText('Necesitás iniciar sesión')).toBeInTheDocument();
    expect(screen.queryByText('panel admin')).not.toBeInTheDocument();
  });

  it('shows 403 to a buyer opening an admin route', () => {
    renderAs('buyer');
    expect(screen.getByText('Acceso denegado (403)')).toBeInTheDocument();
    expect(screen.queryByText('panel admin')).not.toBeInTheDocument();
  });

  it('renders the content for an admin', () => {
    renderAs('admin');
    expect(screen.getByText('panel admin')).toBeInTheDocument();
  });
});
