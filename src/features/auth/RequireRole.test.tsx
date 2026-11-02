import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_USERS } from '@/data/initialData';
import { RequireRole } from '@/features/auth/RequireRole';
import { AccountRole } from '@/types';

const session = vi.hoisted(() => ({ value: { currentUser: null as unknown, isAuthLoading: false } }));

vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => session.value }));
vi.mock('@/features/auth/AuthModalProvider', () => ({ useAuthModal: () => ({ openAuth: vi.fn() }) }));

const renderAs = (role: AccountRole | 'visitor', isAuthLoading = false) => {
  session.value = {
    currentUser: INITIAL_USERS.find(candidate => candidate.role === role) ?? null,
    isAuthLoading,
  };
  render(
    <MemoryRouter>
      <RequireRole roles={['admin']}>
        <p>panel admin</p>
      </RequireRole>
    </MemoryRouter>,
  );
};

describe('RequireRole', () => {
  it('waits while Firebase restores the session', () => {
    renderAs('admin', true);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('panel admin')).not.toBeInTheDocument();
  });

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

  it('CA-3: shows 403 to a buyer accessing the seller route /vendedor', () => {
    session.value = {
      currentUser: INITIAL_USERS.find(candidate => candidate.role === 'buyer') ?? null,
      isAuthLoading: false,
    };
    render(
      <MemoryRouter>
        <RequireRole roles={['seller', 'admin']}>
          <p>Panel del Vendedor</p>
        </RequireRole>
      </MemoryRouter>,
    );
    expect(screen.getByText('Acceso denegado (403)')).toBeInTheDocument();
    expect(screen.queryByText('Panel del Vendedor')).not.toBeInTheDocument();
  });

  it('CA-3: allows an active seller to access the seller route /vendedor', () => {
    session.value = {
      currentUser: INITIAL_USERS.find(candidate => candidate.role === 'seller') ?? null,
      isAuthLoading: false,
    };
    render(
      <MemoryRouter>
        <RequireRole roles={['seller', 'admin']}>
          <p>Panel del Vendedor</p>
        </RequireRole>
      </MemoryRouter>,
    );
    expect(screen.getByText('Panel del Vendedor')).toBeInTheDocument();
    expect(screen.queryByText('Acceso denegado (403)')).not.toBeInTheDocument();
  });
});
