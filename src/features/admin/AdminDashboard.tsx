import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Ban, Check, Eye, History, Search, ShieldCheck, Trash2, X } from 'lucide-react';

import { paths } from '@/constants/routes';
import { useAuditLog } from '@/features/admin/useAuditLog';
import { useModeration } from '@/features/admin/useModeration';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useReports } from '@/features/catalog/reports/ReportsProvider';
import { AuditAction, Book } from '@/types';

const AUDIT_ACTION_CONFIG: Record<AuditAction, { label: string; badgeClass: string }> = {
  approve_book: { label: 'Aprobó Libro', badgeClass: 'bg-emerald-100 text-emerald-800' },
  reject_book: { label: 'Rechazó Libro', badgeClass: 'bg-rose-100 text-rose-800' },
  withdraw_book: { label: 'Retiró Libro', badgeClass: 'bg-amber-100 text-amber-800' },
  delete_review: { label: 'Eliminó Reseña', badgeClass: 'bg-rose-100 text-rose-800' },
  resolve_report: { label: 'Resolvió Denuncia', badgeClass: 'bg-blue-100 text-blue-800' },
  dismiss_report: { label: 'Desestimó Denuncia', badgeClass: 'bg-slate-100 text-slate-800' },
  block_user: { label: 'Bloqueó Usuario', badgeClass: 'bg-red-100 text-red-800' },
  unblock_user: { label: 'Desbloqueó Usuario', badgeClass: 'bg-emerald-100 text-emerald-800' },
};

export const AdminDashboard: React.FC = () => {
  const { users } = useSession();
  const { managedBooks: books } = useBooks();
  const { reports } = useReports();
  const { entries: auditEntries, isLoading: isAuditLoading } = useAuditLog();
  const { approveBook, rejectBook, withdrawBook, resolveReport, toggleBlockUser } = useModeration();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'moderation' | 'reports' | 'users' | 'audit'>('moderation');

  // Search states
  const [bookSearch, setBookSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');

  const [rejectingBookId, setRejectingBookId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const pendingBooks = useMemo(() => books.filter(book => book.status === 'pending_review'), [books]);
  const publishedBooks = useMemo(() => books.filter(book => book.status === 'published'), [books]);
  const pendingReports = useMemo(() => reports.filter(report => report.status === 'pending'), [reports]);

  // Book filtering (CA-4)
  const matchesBookQuery = (book: Book, term: string) => {
    if (!term) return true;
    return (
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term) ||
      (book.sellerName && book.sellerName.toLowerCase().includes(term)) ||
      (book.isbn && book.isbn.toLowerCase().includes(term)) ||
      (book.genre && book.genre.toLowerCase().includes(term))
    );
  };

  const normalizedBookSearch = bookSearch.trim().toLowerCase();
  const filteredPendingBooks = useMemo(
    () => pendingBooks.filter(book => matchesBookQuery(book, normalizedBookSearch)),
    [pendingBooks, normalizedBookSearch],
  );
  const filteredPublishedBooks = useMemo(
    () => publishedBooks.filter(book => matchesBookQuery(book, normalizedBookSearch)),
    [publishedBooks, normalizedBookSearch],
  );

  // User filtering
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedUserSearch) return users;
    return users.filter(user => {
      return (
        user.displayName.toLowerCase().includes(normalizedUserSearch) ||
        user.email.toLowerCase().includes(normalizedUserSearch) ||
        user.role.toLowerCase().includes(normalizedUserSearch) ||
        (user.location && user.location.toLowerCase().includes(normalizedUserSearch))
      );
    });
  }, [users, normalizedUserSearch]);

  // Report filtering
  const normalizedReportSearch = reportSearch.trim().toLowerCase();
  const filteredReports = useMemo(() => {
    if (!normalizedReportSearch) return pendingReports;
    return pendingReports.filter(report => {
      return (
        report.targetTitle.toLowerCase().includes(normalizedReportSearch) ||
        report.reporterName.toLowerCase().includes(normalizedReportSearch) ||
        report.reason.toLowerCase().includes(normalizedReportSearch) ||
        report.details.toLowerCase().includes(normalizedReportSearch)
      );
    });
  }, [pendingReports, normalizedReportSearch]);

  // Audit filtering
  const normalizedAuditSearch = auditSearch.trim().toLowerCase();
  const filteredAuditEntries = useMemo(() => {
    return auditEntries.filter(entry => {
      if (auditActionFilter !== 'all' && entry.action !== auditActionFilter) return false;
      if (!normalizedAuditSearch) return true;
      return (
        entry.adminName.toLowerCase().includes(normalizedAuditSearch) ||
        entry.action.toLowerCase().includes(normalizedAuditSearch) ||
        entry.targetType.toLowerCase().includes(normalizedAuditSearch) ||
        entry.targetId.toLowerCase().includes(normalizedAuditSearch) ||
        (entry.reason && entry.reason.toLowerCase().includes(normalizedAuditSearch))
      );
    });
  }, [auditEntries, auditActionFilter, normalizedAuditSearch]);

  const handleConfirmReject = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = rejectionReason.trim();
    if (!rejectingBookId || !trimmed) return;
    await rejectBook(rejectingBookId, trimmed);
    setRejectingBookId(null);
    setRejectionReason('');
  };

  const handleConfirmBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = blockReason.trim();
    if (!blockingUserId || !trimmed) return;
    await toggleBlockUser(blockingUserId, trimmed);
    setBlockingUserId(null);
    setBlockReason('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-red-100 text-red-800">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Panel de Administración y Moderación</h1>
          </div>
          <p className="text-xs text-slate-500">
            Control de calidad de publicaciones, gestión de denuncias comunitarias, usuarios y registro de auditoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-3 py-1.5 rounded-xl transition-all relative ${
              activeTab === 'moderation' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Moderación de Libros</span>
            {pendingBooks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {pendingBooks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-xl transition-all relative ${
              activeTab === 'reports' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Denuncias y Reportes</span>
            {pendingReports.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                {pendingReports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Gestión de Usuarios</span>
          </button>

          <button
            data-testid="audit-tab-btn"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Auditoría</span>
            {auditEntries.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {auditEntries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'moderation' && (
        <div className="space-y-6">
          {/* Barra de búsqueda de libros (CA-4) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                data-testid="admin-book-search"
                value={bookSearch}
                onChange={event => setBookSearch(event.target.value)}
                placeholder="Buscar libros por título, autor, vendedor, género o ISBN..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
              />
              {bookSearch && (
                <button
                  onClick={() => setBookSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {bookSearch && (
              <span className="text-xs text-slate-500 font-medium">
                Filtrando resultados para: <strong className="text-slate-800">"{bookSearch}"</strong>
              </span>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    Libros pendientes de aprobación ({filteredPendingBooks.length}
                    {bookSearch ? ` de ${pendingBooks.length}` : ''})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Revisa las fichas subidas por los vendedores antes de publicarlas en el catálogo oficial
                </p>
              </div>
            </div>

            {filteredPendingBooks.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                {pendingBooks.length === 0 ? (
                  <>
                    <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No hay publicaciones pendientes de revisión</p>
                    <p className="text-slate-400 mt-0.5">Todos los libros enviados han sido aprobados o procesados.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Sin coincidencias en libros pendientes</p>
                    <p className="text-slate-400 mt-0.5">Prueba con otro término de búsqueda.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPendingBooks.map(book => (
                  <div
                    key={book.id}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-14 h-20 object-cover rounded-xl shadow-xs border border-slate-200 shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            Pendiente de Aprobación
                          </span>
                          <span className="text-xs font-semibold text-slate-500">{book.genre}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 truncate">{book.title}</h4>
                        <p className="text-xs text-slate-600">Por {book.author}</p>
                        <p className="text-[11px] text-slate-400">
                          Vendedor: <strong>{book.sellerName}</strong> • Precio:{' '}
                          <strong>${book.price.toFixed(2)}</strong> • ISBN: {book.isbn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => navigate(paths.book(book.id))}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha Completa</span>
                      </button>

                      <button
                        data-testid={`approve-book-${book.id}`}
                        onClick={() => approveBook(book.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprobar Publicación</span>
                      </button>

                      <button
                        data-testid={`reject-book-${book.id}`}
                        onClick={() => {
                          setRejectingBookId(book.id);
                          setRejectionReason('La información de la edición o portada requiere mejoras.');
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Rechazar con Motivo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Libros Activos en el Catálogo ({filteredPublishedBooks.length}
                {bookSearch ? ` de ${publishedBooks.length}` : ''})
              </h3>
              <p className="text-xs text-slate-500">
                El administrador puede dar de baja cualquier título que incumpla las políticas comunitarias
              </p>
            </div>

            {filteredPublishedBooks.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No se encontraron libros activos</p>
                <p className="text-slate-400 mt-0.5">Prueba con otro término de búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Título y Autor</th>
                      <th className="px-6 py-3.5">Vendedor</th>
                      <th className="px-6 py-3.5">Precio</th>
                      <th className="px-6 py-3.5">Ventas</th>
                      <th className="px-6 py-3.5 text-right">Moderación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPublishedBooks.map(book => (
                      <tr key={book.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <img src={book.coverUrl} alt={book.title} className="w-8 h-10 object-cover rounded" />
                            <div>
                              <p className="font-bold text-slate-900">{book.title}</p>
                              <p className="text-slate-500 text-[11px]">{book.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-medium">{book.sellerName}</td>
                        <td className="px-6 py-3.5 font-bold">${book.price.toFixed(2)}</td>
                        <td className="px-6 py-3.5">{book.salesCount || 0} ejemplares</td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            data-testid={`withdraw-book-${book.id}`}
                            onClick={() => withdrawBook(book.id)}
                            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Retirar de la venta por incumplimiento"
                          >
                            Dar de baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Barra de búsqueda de reportes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                data-testid="admin-report-search"
                value={reportSearch}
                onChange={event => setReportSearch(event.target.value)}
                placeholder="Buscar denuncias por contenido, denunciante o motivo..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
              />
              {reportSearch && (
                <button
                  onClick={() => setReportSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Denuncias Comunitarias Recibidas ({filteredReports.length}
                {reportSearch ? ` de ${pendingReports.length}` : ''})
              </h3>
              <p className="text-xs text-slate-500">
                Reportes enviados por compradores sobre libros o reseñas sospechosas
              </p>
            </div>

            {filteredReports.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                {pendingReports.length === 0 ? (
                  <>
                    <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Bandeja de denuncias al día</p>
                    <p className="text-slate-400 mt-0.5">No hay denuncias pendientes de resolución.</p>
                  </>
                ) : (
                  <>
                    <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No se encontraron denuncias coincidentes</p>
                    <p className="text-slate-400 mt-0.5">Prueba con otro término de búsqueda.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReports.map(report => (
                  <div key={report.id} className="p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            report.targetType === 'book'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          Denuncia sobre {report.targetType === 'book' ? 'Libro' : 'Reseña'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{report.targetTitle}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                      <p className="font-bold text-rose-700">Motivo: {report.reason}</p>
                      <p className="text-slate-600">Detalles: "{report.details}"</p>
                      <p className="text-[10px] text-slate-400">Denunciante: {report.reporterName}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        data-testid={`dismiss-report-${report.id}`}
                        onClick={() => resolveReport(report.id, 'dismiss')}
                        className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Desestimar Denuncia
                      </button>

                      <button
                        data-testid={`resolve-report-${report.id}`}
                        onClick={() => resolveReport(report.id, 'remove_target')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{report.targetType === 'book' ? 'Retirar Libro Denunciado' : 'Eliminar Reseña'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Barra de búsqueda de usuarios */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                data-testid="admin-user-search"
                value={userSearch}
                onChange={event => setUserSearch(event.target.value)}
                placeholder="Buscar usuarios por nombre, correo electrónico o rol..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
              />
              {userSearch && (
                <button
                  onClick={() => setUserSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Gestión y Control de Usuarios ({filteredUsers.length}
                {userSearch ? ` de ${users.length}` : ''})
              </h3>
              <p className="text-xs text-slate-500">
                Permite bloquear y desbloquear usuarios registrando el motivo de la acción.
              </p>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No se encontraron usuarios coincidentes</p>
                <p className="text-slate-400 mt-0.5">Prueba con otro término de búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Usuario</th>
                      <th className="px-6 py-3.5">Rol</th>
                      <th className="px-6 py-3.5">Ubicación</th>
                      <th className="px-6 py-3.5">Estado</th>
                      <th className="px-6 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                user.photoURL ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                              }
                              alt={user.displayName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{user.displayName}</p>
                              <p className="text-slate-400 text-[11px]">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'seller'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {user.role === 'admin'
                              ? 'Administrador'
                              : user.role === 'seller'
                                ? 'Vendedor'
                                : 'Comprador'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-500">{user.location || 'Latinoamérica'}</td>

                        <td className="px-6 py-4">
                          {user.isBlocked ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>Bloqueado</span>
                              </span>
                              {user.blockReason && (
                                <p className="text-[10px] text-rose-600 truncate max-w-xs">{user.blockReason}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Activo</span>
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {user.role !== 'admin' &&
                            (user.isBlocked ? (
                              <button
                                data-testid={`unblock-user-${user.id}`}
                                onClick={() => toggleBlockUser(user.id)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button
                                data-testid={`block-user-${user.id}`}
                                onClick={() => {
                                  setBlockingUserId(user.id);
                                  setBlockReason('Infracción a las condiciones de servicio y calidad.');
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Bloquear Usuario
                              </button>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                data-testid="admin-audit-search"
                value={auditSearch}
                onChange={event => setAuditSearch(event.target.value)}
                placeholder="Buscar en auditoría por admin, acción, destino o motivo..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
              />
              {auditSearch && (
                <button
                  onClick={() => setAuditSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtrar por acción:</span>
              <select
                value={auditActionFilter}
                onChange={event => setAuditActionFilter(event.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-medium text-slate-700"
              >
                <option value="all">Todas las acciones</option>
                <option value="approve_book">Aprobación de Libro</option>
                <option value="reject_book">Rechazo de Publicación</option>
                <option value="withdraw_book">Retiro de Libro</option>
                <option value="resolve_report">Resolución de Denuncia</option>
                <option value="dismiss_report">Desestimación de Denuncia</option>
                <option value="delete_review">Eliminación de Reseña</option>
                <option value="block_user">Bloqueo de Usuario</option>
                <option value="unblock_user">Desbloqueo de Usuario</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registro de Acciones de Moderación (Audit Log)</h3>
                <p className="text-xs text-slate-500">
                  Historial inmutable de acciones críticas ejecutadas por los administradores (RNF-14 / CA-3)
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
                {filteredAuditEntries.length} eventos registrados
              </span>
            </div>

            {isAuditLoading ? (
              <div className="p-10 text-center text-slate-400 text-xs">Cargando registros de auditoría...</div>
            ) : filteredAuditEntries.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No hay registros de auditoría que mostrar</p>
                <p className="text-slate-400 mt-0.5">
                  Las acciones de moderación (aprobar, rechazar, retirar, denuncias o bloqueos) se registrarán aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table data-testid="audit-table" className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-3.5">Fecha y Hora</th>
                      <th className="px-6 py-3.5">Administrador</th>
                      <th className="px-6 py-3.5">Acción</th>
                      <th className="px-6 py-3.5">Destino</th>
                      <th className="px-6 py-3.5">Motivo / Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditEntries.map(entry => {
                      const actionConfig = AUDIT_ACTION_CONFIG[entry.action] || {
                        label: entry.action,
                        badgeClass: 'bg-slate-100 text-slate-800',
                      };
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">{entry.adminName}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{entry.adminId}</span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionConfig.badgeClass}`}
                            >
                              {actionConfig.label}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-bold uppercase text-[10px] text-slate-500 mr-1.5">
                              {entry.targetType}:
                            </span>
                            <span className="font-mono text-[11px] text-slate-700">{entry.targetId}</span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-slate-700 font-medium">
                              {entry.reason || <span className="text-slate-400 italic">Sin observaciones</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Rechazo de Publicación (CA-1: Motivo obligatorio) */}
      {rejectingBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-slate-900">Motivo del Rechazo de Publicación</h4>
            <p className="text-xs text-slate-500">
              Indica con claridad las correcciones necesarias para que el vendedor pueda actualizar su borrador (CA-1:
              motivo obligatorio).
            </p>
            <div>
              <textarea
                data-testid="rejection-reason-input"
                rows={3}
                required
                value={rejectionReason}
                onChange={event => setRejectionReason(event.target.value)}
                placeholder="Escribe el motivo del rechazo aquí..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
              />
              {!rejectionReason.trim() && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  * El motivo del rechazo es obligatorio para guiar al vendedor.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingBookId(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                data-testid="confirm-reject-btn"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  rejectionReason.trim()
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bloqueo de Usuario (Motivo obligatorio) */}
      {blockingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-slate-900">Bloquear Usuario</h4>
            <p className="text-xs text-slate-500">
              Registra el motivo del bloqueo. El usuario no podrá iniciar sesión, comprar ni publicar títulos (CA-2).
            </p>
            <div>
              <textarea
                data-testid="block-reason-input"
                rows={3}
                required
                value={blockReason}
                onChange={event => setBlockReason(event.target.value)}
                placeholder="Ingresa el motivo del bloqueo..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
              />
              {!blockReason.trim() && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">* Debes especificar el motivo del bloqueo.</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockingUserId(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                data-testid="confirm-block-btn"
                onClick={handleConfirmBlock}
                disabled={!blockReason.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  blockReason.trim()
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirmar Bloqueo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
