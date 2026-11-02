import { deleteField, doc, WriteBatch, writeBatch } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { API_ROUTES } from '@/constants/api';
import { useSession } from '@/features/auth/SessionProvider';
import { deleteReview } from '@/features/catalog/reviews/reviewsService';
import { getErrorMessage } from '@/lib/errors';
import { postApi } from '@/services/api';
import { addAuditEntry } from '@/services/auditLog';
import { db } from '@/services/firebase';
import { firestoreRefs } from '@/services/firestore';
import { Book, Report, UserProfile } from '@/types';

export type ReportResolution = 'dismiss' | 'remove_target';

export function useModeration() {
  const { currentUser } = useSession();
  const { showToast } = useToast();

  const run = async (task: () => Promise<void>, success: string, tone: 'success' | 'info' = 'success') => {
    try {
      await task();
      showToast(success, tone);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const asAdmin = (write: (batch: WriteBatch, admin: UserProfile) => void) => async () => {
    if (!currentUser) throw new Error('Iniciá sesión como administrador.');
    const batch = writeBatch(db);
    write(batch, currentUser);
    await batch.commit();
  };

  const setBookStatus = (batch: WriteBatch, bookId: string, status: Book['status'], reason?: string) =>
    batch.update(firestoreRefs.book(bookId), {
      status,
      rejectionReason: reason ?? deleteField(),
      updatedAt: new Date().toISOString(),
    });

  const approveBook = (book: Book) =>
    run(
      asAdmin((batch, admin) => {
        setBookStatus(batch, book.id, 'published');
        addAuditEntry(batch, admin, {
          action: 'approve_book',
          targetType: 'book',
          targetId: book.id,
          targetLabel: book.title,
        });
      }),
      'Publicación aprobada. El libro ya está en el catálogo.',
    );

  const rejectBook = (book: Book, reason: string) =>
    run(
      asAdmin((batch, admin) => {
        setBookStatus(batch, book.id, 'rejected', reason);
        addAuditEntry(batch, admin, {
          action: 'reject_book',
          targetType: 'book',
          targetId: book.id,
          targetLabel: book.title,
          reason,
        });
      }),
      'Publicación rechazada. El vendedor ve el motivo en su panel.',
      'info',
    );

  const withdrawBook = (book: Book, reason: string) =>
    run(
      asAdmin((batch, admin) => {
        setBookStatus(batch, book.id, 'withdrawn', reason);
        addAuditEntry(batch, admin, {
          action: 'withdraw_book',
          targetType: 'book',
          targetId: book.id,
          targetLabel: book.title,
          reason,
        });
      }),
      'Libro retirado de la venta. Quienes lo compraron lo conservan.',
      'info',
    );

  const resolveReport = (report: Report, resolution: ReportResolution, note: string) => {
    const closeReport = (batch: WriteBatch, admin: UserProfile) => {
      batch.update(doc(firestoreRefs.reports(), report.id), {
        status: resolution === 'dismiss' ? 'dismissed' : 'resolved',
        adminNote: note,
        resolvedBy: admin.id,
        resolvedAt: new Date().toISOString(),
      });
      addAuditEntry(batch, admin, {
        action: resolution === 'dismiss' ? 'dismiss_report' : 'resolve_report',
        targetType: 'report',
        targetId: report.id,
        targetLabel: `${report.reason}: ${report.targetTitle}`,
        reason: note,
      });
    };

    if (resolution === 'dismiss') return run(asAdmin(closeReport), 'Denuncia desestimada.');

    if (report.targetType === 'review') {
      return run(async () => {
        const admin = currentUser;
        if (!admin) throw new Error('Iniciá sesión como administrador.');
        await deleteReview(report.targetId, batch => {
          addAuditEntry(batch, admin, {
            action: 'delete_review',
            targetType: 'review',
            targetId: report.targetId,
            targetLabel: report.targetTitle,
            reason: note,
          });
          closeReport(batch, admin);
        });
      }, 'Reseña eliminada y denuncia resuelta.');
    }

    return run(
      asAdmin((batch, admin) => {
        setBookStatus(batch, report.targetId, 'withdrawn', note);
        addAuditEntry(batch, admin, {
          action: 'withdraw_book',
          targetType: 'book',
          targetId: report.targetId,
          targetLabel: report.targetTitle,
          reason: note,
        });
        closeReport(batch, admin);
      }),
      'Libro retirado de la venta y denuncia resuelta.',
    );
  };

  const setUserBlocked = (user: UserProfile, blocked: boolean, reason: string) =>
    run(
      () => postApi(API_ROUTES.adminBlockUser, { userId: user.id, blocked, reason }).then(() => undefined),
      blocked
        ? `${user.displayName} quedó bloqueado y ya no puede iniciar sesión.`
        : `${user.displayName} puede volver a usar su cuenta.`,
    );

  return { approveBook, rejectBook, withdrawBook, resolveReport, setUserBlocked };
}
