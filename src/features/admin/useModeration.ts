import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useReports } from '@/features/catalog/reports/ReportsProvider';
import { deleteReview } from '@/features/catalog/reviews/reviewsService';
import { getErrorMessage } from '@/lib/errors';
import { logAdminAction } from '@/services/auditLog';

export function useModeration() {
  const { currentUser, users, setUserBlocked } = useSession();
  const { updateBook } = useBooks();
  const { reports, setReportStatus } = useReports();
  const { showToast } = useToast();

  const recordAudit = async (event: Parameters<typeof logAdminAction>[1]) => {
    if (currentUser && currentUser.role === 'admin') {
      try {
        await logAdminAction(currentUser, event);
      } catch (error) {
        console.warn('Error al registrar auditoría:', error);
      }
    }
  };

  const approveBook = async (bookId: string, reason?: string) => {
    if (!(await updateBook(bookId, { status: 'published', rejectionReason: undefined }))) return false;
    await recordAudit({
      action: 'approve_book',
      targetType: 'book',
      targetId: bookId,
      reason: reason || 'Publicación aprobada para catálogo público',
    });
    showToast('Publicación aprobada. El libro ya está visible en el catálogo general.', 'success');
    return true;
  };

  const rejectBook = async (bookId: string, reason: string) => {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      showToast('Debes ingresar un motivo para rechazar la publicación.', 'error');
      return false;
    }
    if (!(await updateBook(bookId, { status: 'rejected', rejectionReason: trimmedReason }))) return false;
    await recordAudit({
      action: 'reject_book',
      targetType: 'book',
      targetId: bookId,
      reason: trimmedReason,
    });
    showToast('Publicación rechazada y devuelta al vendedor con el motivo indicado.', 'info');
    return true;
  };

  const withdrawBook = async (bookId: string, reason?: string) => {
    const fallbackReason = reason?.trim() || 'Retirado por el administrador por incumplimiento de normativas.';
    const withdrawn = await updateBook(bookId, {
      status: 'withdrawn',
      rejectionReason: fallbackReason,
    });
    if (withdrawn) {
      await recordAudit({
        action: 'withdraw_book',
        targetType: 'book',
        targetId: bookId,
        reason: fallbackReason,
      });
      showToast('Libro retirado de la venta por administración.', 'info');
    }
    return withdrawn;
  };

  const resolveReport = async (reportId: string, action: 'dismiss' | 'remove_target', adminNote?: string) => {
    const report = reports.find(candidate => candidate.id === reportId);
    if (!report) return false;

    if (action === 'remove_target') {
      if (report.targetType === 'book') {
        if (!(await withdrawBook(report.targetId, adminNote || 'Retirado a raíz de denuncia comunitaria')))
          return false;
      } else {
        try {
          await deleteReview(report.targetId);
          await recordAudit({
            action: 'delete_review',
            targetType: 'review',
            targetId: report.targetId,
            reason: adminNote || 'Reseña eliminada tras reporte comunitario',
          });
        } catch (error) {
          showToast(getErrorMessage(error), 'error');
          return false;
        }
      }
    }

    const resolutionReason =
      adminNote || (action === 'dismiss' ? 'Desestimada por falta de pruebas' : 'Contenido retirado por infracción');

    const updated = await setReportStatus(reportId, action === 'dismiss' ? 'dismissed' : 'resolved', resolutionReason);
    if (!updated) return false;

    await recordAudit({
      action: action === 'dismiss' ? 'dismiss_report' : 'resolve_report',
      targetType: 'report',
      targetId: reportId,
      reason: resolutionReason,
    });

    showToast(`Denuncia procesada: ${action === 'dismiss' ? 'Desestimada' : 'Contenido dado de baja'}`, 'success');
    return true;
  };

  const toggleBlockUser = async (userId: string, reason?: string) => {
    const user = users.find(candidate => candidate.id === userId);
    if (!user) return false;

    const willBlock = !user.isBlocked;
    const trimmedReason =
      reason?.trim() || (willBlock ? 'Infracción de normas' : 'Cuenta rehabilitada por administración');

    if (await setUserBlocked(userId, willBlock, trimmedReason)) {
      await recordAudit({
        action: willBlock ? 'block_user' : 'unblock_user',
        targetType: 'user',
        targetId: userId,
        reason: trimmedReason,
      });
      showToast(willBlock ? 'Usuario bloqueado correctamente.' : 'Usuario desbloqueado con éxito.', 'success');
      return true;
    }
    return false;
  };

  return { approveBook, rejectBook, withdrawBook, resolveReport, toggleBlockUser };
}
