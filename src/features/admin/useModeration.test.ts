import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModeration } from '@/features/admin/useModeration';
import { logAdminAction } from '@/services/auditLog';
import { Report, UserProfile } from '@/types';

const mockToast = vi.fn();
const mockUpdateBook = vi.fn().mockResolvedValue(true);
const mockSetUserBlocked = vi.fn().mockResolvedValue(true);
const mockSetReportStatus = vi.fn().mockResolvedValue(true);
const mockDeleteReview = vi.fn().mockResolvedValue(undefined);

const adminUser: UserProfile = {
  id: 'admin_1',
  email: 'admin@test.com',
  displayName: 'Admin Principal',
  role: 'admin',
  createdAt: '2025-01-01',
};

const regularUser: UserProfile = {
  id: 'user_regular_1',
  email: 'usuario@test.com',
  displayName: 'Usuario Regular',
  role: 'buyer',
  isBlocked: false,
  createdAt: '2025-01-01',
};

const blockedUser: UserProfile = {
  id: 'user_blocked_1',
  email: 'bloqueado@test.com',
  displayName: 'Usuario Bloqueado',
  role: 'seller',
  isBlocked: true,
  blockReason: 'Spam masivo',
  createdAt: '2025-01-01',
};

const bookReport: Report = {
  id: 'report_book_1',
  reporterId: 'reporter_1',
  reporterName: 'Denunciante',
  targetType: 'book',
  targetId: 'book_suspect_1',
  targetTitle: 'Libro Sospechoso',
  reason: 'Contenido ofensivo',
  details: 'Incumple las políticas comunitarias',
  status: 'pending',
  createdAt: '2025-02-01',
};

const reviewReport: Report = {
  id: 'report_review_1',
  reporterId: 'reporter_1',
  reporterName: 'Denunciante',
  targetType: 'review',
  targetId: 'review_suspect_1',
  targetTitle: 'Reseña de Odio',
  reason: 'Lenguaje inapropiado',
  details: 'Insultos directos',
  status: 'pending',
  createdAt: '2025-02-01',
};

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockToast }),
}));

vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({
    currentUser: adminUser,
    users: [adminUser, regularUser, blockedUser],
    setUserBlocked: mockSetUserBlocked,
  }),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({
    updateBook: mockUpdateBook,
  }),
}));

vi.mock('@/features/catalog/reports/ReportsProvider', () => ({
  useReports: () => ({
    reports: [bookReport, reviewReport],
    setReportStatus: mockSetReportStatus,
  }),
}));

vi.mock('@/features/catalog/reviews/reviewsService', () => ({
  deleteReview: (...args: unknown[]) => mockDeleteReview(...args),
}));

vi.mock('@/services/auditLog', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

describe('useModeration - RF-31 / RF-32 / RNF-14', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateBook.mockResolvedValue(true);
    mockSetUserBlocked.mockResolvedValue(true);
    mockSetReportStatus.mockResolvedValue(true);
    mockDeleteReview.mockResolvedValue(undefined);
  });

  describe('CA-1: No se puede rechazar sin motivo', () => {
    it('rejects publication when a valid reason is provided and records auditLog', async () => {
      const { rejectBook } = useModeration();

      const success = await rejectBook('book_1', 'La portada no cumple con la resolución requerida.');

      expect(success).toBe(true);
      expect(mockUpdateBook).toHaveBeenCalledWith('book_1', {
        status: 'rejected',
        rejectionReason: 'La portada no cumple con la resolución requerida.',
      });
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'reject_book',
          targetType: 'book',
          targetId: 'book_1',
          reason: 'La portada no cumple con la resolución requerida.',
        }),
      );
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Publicación rechazada'), 'info');
    });

    it('refuses to reject if reason is empty or only whitespace', async () => {
      const { rejectBook } = useModeration();

      const emptyResult = await rejectBook('book_1', '');
      expect(emptyResult).toBe(false);
      expect(mockUpdateBook).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Debes ingresar un motivo'), 'error');

      mockToast.mockClear();
      const whitespaceResult = await rejectBook('book_1', '     ');
      expect(whitespaceResult).toBe(false);
      expect(mockUpdateBook).not.toHaveBeenCalled();
      expect(logAdminAction).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Debes ingresar un motivo'), 'error');
    });
  });

  describe('CA-3: Registro de acciones críticas en auditLog', () => {
    it('logs approve_book action on book approval', async () => {
      const { approveBook } = useModeration();

      const success = await approveBook('book_1');

      expect(success).toBe(true);
      expect(mockUpdateBook).toHaveBeenCalledWith('book_1', {
        status: 'published',
        rejectionReason: undefined,
      });
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'approve_book',
          targetType: 'book',
          targetId: 'book_1',
        }),
      );
    });

    it('logs withdraw_book action when an admin takes down a book', async () => {
      const { withdrawBook } = useModeration();

      const success = await withdrawBook('book_1', 'Violación de derechos de autor');

      expect(success).toBe(true);
      expect(mockUpdateBook).toHaveBeenCalledWith('book_1', {
        status: 'withdrawn',
        rejectionReason: 'Violación de derechos de autor',
      });
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'withdraw_book',
          targetType: 'book',
          targetId: 'book_1',
          reason: 'Violación de derechos de autor',
        }),
      );
    });

    it('logs dismiss_report when dismissing a report', async () => {
      const { resolveReport } = useModeration();

      const success = await resolveReport('report_book_1', 'dismiss');

      expect(success).toBe(true);
      expect(mockSetReportStatus).toHaveBeenCalledWith('report_book_1', 'dismissed', expect.any(String));
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'dismiss_report',
          targetType: 'report',
          targetId: 'report_book_1',
        }),
      );
    });

    it('withdraws book and logs resolve_report when removing a reported book', async () => {
      const { resolveReport } = useModeration();

      const success = await resolveReport('report_book_1', 'remove_target', 'Retirado por infracción');

      expect(success).toBe(true);
      expect(mockUpdateBook).toHaveBeenCalledWith('book_suspect_1', expect.objectContaining({ status: 'withdrawn' }));
      expect(mockSetReportStatus).toHaveBeenCalledWith('report_book_1', 'resolved', 'Retirado por infracción');
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'resolve_report',
          targetType: 'report',
          targetId: 'report_book_1',
        }),
      );
    });

    it('deletes review and logs resolve_report when removing a reported review', async () => {
      const { resolveReport } = useModeration();

      const success = await resolveReport('report_review_1', 'remove_target', 'Reseña ofensiva eliminada');

      expect(success).toBe(true);
      expect(mockDeleteReview).toHaveBeenCalledWith('review_suspect_1');
      expect(mockSetReportStatus).toHaveBeenCalledWith('report_review_1', 'resolved', 'Reseña ofensiva eliminada');
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'delete_review',
          targetType: 'review',
          targetId: 'review_suspect_1',
        }),
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'resolve_report',
          targetType: 'report',
          targetId: 'report_review_1',
        }),
      );
    });

    it('blocks user with motive and logs block_user action', async () => {
      const { toggleBlockUser } = useModeration();

      const success = await toggleBlockUser('user_regular_1', 'Intento de fraude reiterado');

      expect(success).toBe(true);
      expect(mockSetUserBlocked).toHaveBeenCalledWith('user_regular_1', true, 'Intento de fraude reiterado');
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'block_user',
          targetType: 'user',
          targetId: 'user_regular_1',
          reason: 'Intento de fraude reiterado',
        }),
      );
    });

    it('unblocks user and logs unblock_user action', async () => {
      const { toggleBlockUser } = useModeration();

      const success = await toggleBlockUser('user_blocked_1', 'Apelación aprobada');

      expect(success).toBe(true);
      expect(mockSetUserBlocked).toHaveBeenCalledWith('user_blocked_1', false, 'Apelación aprobada');
      expect(logAdminAction).toHaveBeenCalledWith(
        adminUser,
        expect.objectContaining({
          action: 'unblock_user',
          targetType: 'user',
          targetId: 'user_blocked_1',
          reason: 'Apelación aprobada',
        }),
      );
    });
  });
});
