import { MemoryRouter } from 'react-router';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { AuditLogEntry, Book, UserProfile } from '@/types';

const fake = vi.hoisted(() => ({
  rejectBook: vi.fn(),
  approveBook: vi.fn(),
  withdrawBook: vi.fn(),
  resolveReport: vi.fn(),
  setUserBlocked: vi.fn(),
  audit: [] as object[],
}));

const book = (id: string, title: string, overrides: Partial<Book> = {}) =>
  ({
    id,
    title,
    author: 'Autor Genérico',
    isbn: '',
    genre: 'Novela',
    condition: 'digital',
    price: 10,
    coverUrl: '',
    sellerName: 'Tinta Sur',
    status: 'published',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }) as Book;

const BOOKS = [
  book('pending', 'Rayuela', { status: 'pending_review', author: 'Julio Cortázar' }),
  book('rejected', 'El túnel', { status: 'rejected', author: 'Ernesto Sábato', rejectionReason: 'Portada borrosa.' }),
  book('published', 'Ficciones', { isbn: '978-0307950925', author: 'Jorge Luis Borges' }),
];

const USERS = [
  {
    id: 'buyer-1',
    displayName: 'Renata Ortiz',
    email: 'renata.ortiz@mercadolibros.com',
    role: 'buyer',
    isBlocked: false,
  },
  {
    id: 'blocked-1',
    displayName: 'Tomás Ruiz',
    email: 'tomas@test.com',
    role: 'buyer',
    isBlocked: true,
    blockReason: 'Spam',
  },
  { id: 'admin-1', displayName: 'Lev', email: 'lev@test.com', role: 'admin', isBlocked: false },
] as UserProfile[];

vi.mock('@/features/admin/useModeration', () => ({
  useModeration: () => ({
    approveBook: fake.approveBook,
    rejectBook: fake.rejectBook,
    withdrawBook: fake.withdrawBook,
    resolveReport: fake.resolveReport,
    setUserBlocked: fake.setUserBlocked,
  }),
}));
vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => ({ users: USERS }) }));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooks: () => ({ managedBooks: BOOKS }) }));
vi.mock('@/features/catalog/reports/ReportsProvider', () => ({ useReports: () => ({ reports: [] }) }));
vi.mock('@/services/firestore', () => ({ firestoreRefs: { auditLog: () => ({}) } }));
vi.mock('firebase/firestore', () => ({
  query: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  onSnapshot: (
    _query: unknown,
    _options: unknown,
    next: (snapshot: { docs: { data: () => object }[]; metadata: { fromCache: boolean } }) => void,
  ) => {
    next({ docs: fake.audit.slice(0, 1).map(entry => ({ data: () => entry })), metadata: { fromCache: true } });
    next({ docs: fake.audit.map(entry => ({ data: () => entry })), metadata: { fromCache: false } });
    return () => undefined;
  },
}));

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );

const openTab = (name: string) => fireEvent.click(screen.getByRole('tab', { name: new RegExp(name) }));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.rejectBook.mockResolvedValue(true);
    fake.setUserBlocked.mockResolvedValue(true);
    fake.audit = [];
  });

  it('CA-1: a book cannot be rejected without writing a reason', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Motivo del rechazo/)).toHaveValue('');

    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar publicación' })));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Escribí el motivo');
    expect(fake.rejectBook).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Motivo del rechazo/), { target: { value: 'Falta la sinopsis.' } });
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Rechazar publicación' })));
    expect(fake.rejectBook).toHaveBeenCalledWith(BOOKS[0], 'Falta la sinopsis.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('CA-4: finds books in any status by title, author or ISBN, ignoring accents', () => {
    renderDashboard();
    openTab('Libros');
    const search = screen.getByRole('searchbox', { name: 'Buscar en todos los libros' });

    fireEvent.change(search, { target: { value: 'sabato' } });
    expect(screen.getByRole('link', { name: 'El túnel' })).toBeInTheDocument();
    expect(screen.getByText('Portada borrosa.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rayuela' })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '978-0307950925' } });
    expect(screen.getByRole('link', { name: 'Ficciones' })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'pending_review' } });
    expect(screen.getByText('1 de 3 libros')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rayuela' })).toBeInTheDocument();
  });

  it('searches users, filters the blocked ones and asks for a reason before blocking', async () => {
    renderDashboard();
    openTab('Usuarios');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), { target: { value: 'renata' } });
    expect(screen.getByText('1 de 3 usuarios')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Motivo del bloqueo/), { target: { value: 'Fraude reiterado' } });
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Bloquear' })));
    expect(fake.setUserBlocked).toHaveBeenCalledWith(USERS[0], true, 'Fraude reiterado');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar usuarios' }), { target: { value: 'blocked' } });
    expect(screen.getByText('Tomás Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument();
  });

  it('admins cannot be blocked from the panel', () => {
    renderDashboard();
    openTab('Usuarios');
    const adminRow = screen.getByRole('link', { name: 'Lev' }).closest('tr') as HTMLElement;
    expect(within(adminRow).queryByRole('button')).not.toBeInTheDocument();
  });

  it('CA-3: shows each audited action with admin, action, date and time, target and reason', () => {
    const entry: AuditLogEntry = {
      id: 'entry-1',
      adminId: 'admin-1',
      adminName: 'Lev',
      action: 'reject_book',
      targetType: 'book',
      targetId: 'rejected',
      targetLabel: 'El túnel',
      reason: 'Portada borrosa.',
      createdAt: '2026-11-01T22:05:00.000Z',
    };
    fake.audit = [entry, { ...entry, id: 'entry-2', action: 'block_user', targetType: 'user', targetLabel: 'Tomás' }];
    renderDashboard();
    openTab('Registro');
    const rows = within(screen.getByTestId('audit-table')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Lev');
    expect(rows[1]).toHaveTextContent('Rechazó un libro');
    expect(rows[1]).toHaveTextContent('El túnel');
    expect(rows[1]).toHaveTextContent('Portada borrosa.');
    expect(rows[1]).toHaveTextContent(/\d{1,2}\/\d{1,2}\/\d{2,4}.*\d{1,2}:\d{2}/);

    fireEvent.change(screen.getByRole('combobox', { name: 'Acción' }), { target: { value: 'block_user' } });
    expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(2);
  });
});
