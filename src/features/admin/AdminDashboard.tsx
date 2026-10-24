import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Check, X, Trash2, Ban, Eye } from 'lucide-react';
import { paths } from '../../constants/routes';
import { useSession } from '../auth/SessionProvider';
import { useBooks } from '../catalog/BooksProvider';
import { useReports } from '../catalog/reports/ReportsProvider';
import { useModeration } from './useModeration';

export const AdminDashboard: React.FC = () => {
  const { users } = useSession();
  const { books } = useBooks();
  const { reports } = useReports();
  const { approveBook, rejectBook, withdrawBook, resolveReport, toggleBlockUser } = useModeration();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'moderation' | 'reports' | 'users'>('moderation');
  
  const [rejectingBookId, setRejectingBookId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const pendingBooks = books.filter(b => b.status === 'pending_review');
  const publishedBooks = books.filter(b => b.status === 'published');

  const pendingReports = reports.filter(r => r.status === 'pending');

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBookId || !rejectionReason.trim()) return;
    await rejectBook(rejectingBookId, rejectionReason.trim());
    setRejectingBookId(null);
    setRejectionReason('');
  };

  const handleConfirmBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingUserId) return;
    await toggleBlockUser(blockingUserId, blockReason.trim() || 'Infracción de normas');
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
            <h1 className="text-2xl font-black text-slate-900">
              Panel de Administración y Moderación
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Control de calidad de publicaciones, gestión de denuncias comunitarias y control de usuarios.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
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
        </div>
      </div>

      {activeTab === 'moderation' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Libros pendientes de aprobación ({pendingBooks.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Revisa las fichas subidas por los vendedores antes de publicarlas en el catálogo oficial
                </p>
              </div>
            </div>

            {pendingBooks.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-slate-700 text-sm">No hay publicaciones pendientes de revisión</p>
                <p className="text-slate-400 mt-0.5">Todos los libros enviados han sido aprobados o procesados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingBooks.map(book => (
                  <div key={book.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
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
                          Vendedor: <strong>{book.sellerName}</strong> • Precio: <strong>${book.price.toFixed(2)}</strong> • ISBN: {book.isbn}
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
                        onClick={() => approveBook(book.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprobar Publicación</span>
                      </button>

                      <button
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
                Libros Activos en el Catálogo ({publishedBooks.length})
              </h3>
              <p className="text-xs text-slate-500">
                El administrador puede dar de baja cualquier título que incumpla las políticas comunitarias
              </p>
            </div>

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
                  {publishedBooks.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <img src={b.coverUrl} alt={b.title} className="w-8 h-10 object-cover rounded" />
                          <div>
                            <p className="font-bold text-slate-900">{b.title}</p>
                            <p className="text-slate-500 text-[11px]">{b.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-medium">{b.sellerName}</td>
                      <td className="px-6 py-3.5 font-bold">${b.price.toFixed(2)}</td>
                      <td className="px-6 py-3.5">{b.salesCount || 0} ejemplares</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => withdrawBook(b.id)}
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
          </div>

        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Denuncias Comunitarias Recibidas
              </h3>
              <p className="text-xs text-slate-500">
                Reportes enviados por compradores sobre libros o reseñas sospechosas
              </p>
            </div>

            {pendingReports.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Check className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-slate-700 text-sm">Bandeja de denuncias al día</p>
                <p className="text-slate-400 mt-0.5">No hay denuncias pendientes de resolución.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingReports.map(report => (
                  <div key={report.id} className="p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          report.targetType === 'book' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
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
                        onClick={() => resolveReport(report.id, 'dismiss')}
                        className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Desestimar Denuncia
                      </button>

                      <button
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
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Gestión y Control de Usuarios
            </h3>
            <p className="text-xs text-slate-500">
              Permite bloquear y desbloquear usuarios registrando el motivo de la acción.
            </p>
          </div>

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
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{u.displayName}</p>
                          <p className="text-slate-400 text-[11px]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-red-100 text-red-800' :
                        u.role === 'seller' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role === 'admin' ? 'Administrador' : u.role === 'seller' ? 'Vendedor' : 'Comprador'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {u.location || 'Latinoamérica'}
                    </td>

                    <td className="px-6 py-4">
                      {u.isBlocked ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <Ban className="w-3 h-3 text-rose-600" />
                            <span>Bloqueado</span>
                          </span>
                          {u.blockReason && (
                            <p className="text-[10px] text-rose-600 truncate max-w-xs">{u.blockReason}</p>
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
                      {u.role !== 'admin' && (
                        u.isBlocked ? (
                          <button
                            onClick={() => toggleBlockUser(u.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Desbloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBlockingUserId(u.id);
                              setBlockReason('Infracción a las condiciones de servicio y calidad.');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Bloquear Usuario
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejectingBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-slate-900">Motivo del Rechazo de Publicación</h4>
            <p className="text-xs text-slate-500">
              Indica con claridad las correcciones necesarias para que el vendedor pueda actualizar su borrador.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingBookId(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {blockingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-slate-900">Bloquear Usuario</h4>
            <p className="text-xs text-slate-500">
              Registra el motivo del bloqueo. El usuario no podrá realizar compras ni publicar títulos.
            </p>
            <textarea
              rows={3}
              required
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockingUserId(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
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
