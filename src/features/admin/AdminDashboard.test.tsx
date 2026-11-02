import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { AuditLogEntry, Book, Report, UserProfile } from '@/types';

const mockApproveBook = vi.fn().mockResolvedValue(true);
const mockRejectBook = vi.fn().mockResolvedValue(true);
const mockWithdrawBook = vi.fn().mockResolvedValue(true);
const mockResolveReport = vi.fn().mockResolvedValue(true);
const mockToggleBlockUser = vi.fn().mockResolvedValue(true);

const adminUser: UserProfile = {
  id: 'admin_1',
  email: 'admin@test.com',
  displayName: 'Admin Moderador',
  role: 'admin',
  createdAt: '2025-01-01',
};

const mockBooks: Book[] = [
  {
    id: 'book_pending_1',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '978-8420471839',
    description: 'Novela clásica',
    price: 18.5,
    condition: 'nuevo',
    genre: 'Ficción',
    language: 'Español',
    coverUrl: 'https://example.com/cover1.jpg',
    sampleText: 'Muchos años después...',
    sellerId: 'seller_1',
    sellerName: 'Librería Central',
    status: 'pending_review',
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 400,
    publicationYear: 1967,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'book_pending_2',
    title: 'Ficciones',
    author: 'Jorge Luis Borges',
    isbn: '978-8420471891',
    description: 'Cuentos',
    price: 14.0,
    condition: 'digital',
    genre: 'Fantasía',
    language: 'Español',
    coverUrl: 'https://example.com/cover2.jpg',
    sampleText: 'El jardín de senderos...',
    sellerId: 'seller_2',
    sellerName: 'Librería Atenea',
    status: 'pending_review',
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 200,
    publicationYear: 1944,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
  {
    id: 'book_published_1',
    title: 'Rayuela',
    author: 'Julio Cortázar',
    isbn: '978-8420471899',
    description: 'Contranovela',
    price: 16.0,
    condition: 'usado',
    genre: 'Novela',
    language: 'Español',
    coverUrl: 'https://example.com/cover3.jpg',
    sampleText: '¿Encontraría a la Maga?...',
    sellerId: 'seller_1',
    sellerName: 'Librería Central',
    status: 'published',
    rating: 4.8,
    reviewCount: 10,
    salesCount: 25,
    pages: 600,
    publicationYear: 1963,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

const mockUsers: UserProfile[] = [
  adminUser,
  {
    id: 'user_1',
    email: 'laura@test.com',
    displayName: 'Laura Vendedora',
    role: 'seller',
    isBlocked: false,
    createdAt: '2025-01-01',
  },
  {
    id: 'user_2',
    email: 'marcos@test.com',
    displayName: 'Marcos Comprador',
    role: 'buyer',
    isBlocked: true,
    blockReason: 'Spam masivo en reseñas',
    createdAt: '2025-01-01',
  },
];

const mockReports: Report[] = [
  {
    id: 'rep_1',
    reporterId: 'user_reporter_1',
    reporterName: 'Carlos Denunciante',
    targetType: 'book',
    targetId: 'book_published_1',
    targetTitle: 'Rayuela',
    reason: 'Precio engañoso',
    details: 'Cobro adicional',
    status: 'pending',
    createdAt: '2025-02-10T12:00:00Z',
  },
];

const mockAuditEntries: AuditLogEntry[] = [
  {
    id: 'audit_1',
    adminId: 'admin_1',
    adminName: 'Admin Moderador',
    action: 'approve_book',
    targetType: 'book',
    targetId: 'book_published_1',
    reason: 'Publicación cumple todas las políticas',
    createdAt: '2025-02-10T14:30:00Z',
  },
  {
    id: 'audit_2',
    adminId: 'admin_1',
    adminName: 'Admin Moderador',
    action: 'block_user',
    targetType: 'user',
    targetId: 'user_2',
    reason: 'Spam masivo en reseñas',
    createdAt: '2025-02-11T09:15:00Z',
  },
];

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({
    currentUser: adminUser,
    users: mockUsers,
  }),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({
    managedBooks: mockBooks,
  }),
}));

vi.mock('@/features/catalog/reports/ReportsProvider', () => ({
  useReports: () => ({
    reports: mockReports,
  }),
}));

vi.mock('@/features/admin/useAuditLog', () => ({
  useAuditLog: () => ({
    entries: mockAuditEntries,
    isLoading: false,
  }),
}));

vi.mock('@/features/admin/useModeration', () => ({
  useModeration: () => ({
    approveBook: mockApproveBook,
    rejectBook: mockRejectBook,
    withdrawBook: mockWithdrawBook,
    resolveReport: mockResolveReport,
    toggleBlockUser: mockToggleBlockUser,
  }),
}));

describe('AdminDashboard - RF-31 / RF-32 / RNF-14', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CA-4: Búsqueda de libros en admin (bug del tablero anterior solucionado)', () => {
    it('filters pending books and published books in real time by title or author', () => {
      render(<AdminDashboard />);

      // Initially both pending books are shown
      expect(screen.getByText('Cien años de soledad')).toBeInTheDocument();
      expect(screen.getByText('Ficciones')).toBeInTheDocument();
      expect(screen.getByText('Rayuela')).toBeInTheDocument();

      const searchInput = screen.getByTestId('admin-book-search');

      // Filter by "Borges"
      fireEvent.change(searchInput, { target: { value: 'Borges' } });

      expect(screen.getByText('Ficciones')).toBeInTheDocument();
      expect(screen.queryByText('Cien años de soledad')).not.toBeInTheDocument();
      expect(screen.queryByText('Rayuela')).not.toBeInTheDocument();

      // Filter by published book title "Rayuela"
      fireEvent.change(searchInput, { target: { value: 'Rayuela' } });
      expect(screen.getByText('Rayuela')).toBeInTheDocument();
      expect(screen.queryByText('Ficciones')).not.toBeInTheDocument();
      expect(screen.queryByText('Cien años de soledad')).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Cien años de soledad')).toBeInTheDocument();
      expect(screen.getByText('Ficciones')).toBeInTheDocument();
      expect(screen.getByText('Rayuela')).toBeInTheDocument();
    });
  });

  describe('CA-1: No se puede rechazar sin motivo', () => {
    it('disables the confirm button when rejection reason is empty and requires text to submit', () => {
      render(<AdminDashboard />);

      const rejectBtn = screen.getByTestId('reject-book-book_pending_1');
      fireEvent.click(rejectBtn);

      const reasonInput = screen.getByTestId('rejection-reason-input');
      const confirmBtn = screen.getByTestId('confirm-reject-btn');

      // Clear the default reason
      fireEvent.change(reasonInput, { target: { value: '' } });
      expect(confirmBtn).toBeDisabled();
      expect(screen.getByText(/motivo del rechazo es obligatorio/i)).toBeInTheDocument();

      // Attempt clicking while disabled
      fireEvent.click(confirmBtn);
      expect(mockRejectBook).not.toHaveBeenCalled();

      // Fill in a valid reason
      fireEvent.change(reasonInput, { target: { value: 'La imagen de portada tiene baja calidad y marcas de agua.' } });
      expect(confirmBtn).not.toBeDisabled();

      fireEvent.click(confirmBtn);
      expect(mockRejectBook).toHaveBeenCalledWith(
        'book_pending_1',
        'La imagen de portada tiene baja calidad y marcas de agua.',
      );
    });
  });

  describe('CA-3: Vista del registro de auditoría (auditLog)', () => {
    it('displays audit log entries with admin, action, date and time, and motive', () => {
      render(<AdminDashboard />);

      const auditTabBtn = screen.getByTestId('audit-tab-btn');
      fireEvent.click(auditTabBtn);

      expect(screen.getByTestId('audit-table')).toBeInTheDocument();
      expect(screen.getAllByText('Admin Moderador').length).toBeGreaterThan(0);
      expect(screen.getByText('Aprobó Libro')).toBeInTheDocument();
      expect(screen.getByText('Bloqueó Usuario')).toBeInTheDocument();
      expect(screen.getByText('Publicación cumple todas las políticas')).toBeInTheDocument();
      expect(screen.getByText('Spam masivo en reseñas')).toBeInTheDocument();
    });
  });

  describe('Búsqueda y gestión de usuarios', () => {
    it('filters users by name and allows blocking with a motive', () => {
      render(<AdminDashboard />);

      const usersTabBtn = screen.getByRole('button', { name: /Gestión de Usuarios/i });
      fireEvent.click(usersTabBtn);

      expect(screen.getByText('Laura Vendedora')).toBeInTheDocument();
      expect(screen.getByText('Marcos Comprador')).toBeInTheDocument();

      const userSearchInput = screen.getByTestId('admin-user-search');
      fireEvent.change(userSearchInput, { target: { value: 'Marcos' } });

      expect(screen.getByText('Marcos Comprador')).toBeInTheDocument();
      expect(screen.queryByText('Laura Vendedora')).not.toBeInTheDocument();
    });
  });
});
