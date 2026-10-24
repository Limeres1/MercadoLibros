import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useReports } from '@/features/catalog/reports/ReportsProvider';
import { useReviews } from '@/features/catalog/reviews/ReviewsProvider';

export function useModeration() {
  const { users, setUserBlocked } = useSession();
  const { updateBook } = useBooks();
  const { removeReview } = useReviews();
  const { reports, setReportStatus } = useReports();
  const { showToast } = useToast();

  const approveBook = async (bookId: string) => {
    updateBook(bookId, { status: 'published', rejectionReason: undefined });
    showToast('Publicación aprobada. El libro ya está visible en el catálogo general.', 'success');
  };

  const rejectBook = async (bookId: string, reason: string) => {
    updateBook(bookId, { status: 'rejected', rejectionReason: reason });
    showToast('Publicación rechazada y devuelta al vendedor con el motivo indicado.', 'info');
  };

  const withdrawBook = async (bookId: string) => {
    updateBook(bookId, {
      status: 'withdrawn',
      rejectionReason: 'Retirado por el administrador por incumplimiento de normativas.',
    });
    showToast('Libro retirado de la venta por administración.', 'info');
  };

  const resolveReport = async (reportId: string, action: 'dismiss' | 'remove_target') => {
    const report = reports.find(candidate => candidate.id === reportId);
    if (!report) return;

    if (action === 'remove_target') {
      if (report.targetType === 'book') await withdrawBook(report.targetId);
      else await removeReview(report.targetId);
    }

    setReportStatus(
      reportId,
      action === 'dismiss' ? 'dismissed' : 'resolved',
      action === 'dismiss' ? 'Desestimada por falta de pruebas' : 'Contenido retirado por infracción',
    );
    showToast(`Denuncia procesada: ${action === 'dismiss' ? 'Desestimada' : 'Contenido dado de baja'}`, 'success');
  };

  const toggleBlockUser = async (userId: string, reason?: string) => {
    const user = users.find(candidate => candidate.id === userId);
    if (!user) return;
    setUserBlocked(userId, !user.isBlocked, reason);
    showToast('Estado del usuario actualizado con éxito.', 'success');
  };

  return { approveBook, rejectBook, withdrawBook, resolveReport, toggleBlockUser };
}
