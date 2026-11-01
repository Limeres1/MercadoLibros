import React, { useMemo, useState } from 'react';
import { AlertTriangle, Archive, BarChart3, BookOpen, CheckCircle, Clock, Edit3, Plus, Store } from 'lucide-react';

import { CreateBookModal } from '@/features/seller/CreateBookModal';
import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { Book } from '@/types';

export const SellerDashboard: React.FC = () => {
  const { sellerBooks, saveBook, withdrawBook } = useSellerBooks();
  const [period, setPeriod] = useState<'7d' | 'month' | 'year' | 'all'>('month');
  const [editor, setEditor] = useState<{ book: Book | null } | null>(null);

  const stats = useMemo(() => {
    let totalSalesCount = 0;
    let totalRevenue = 0;

    sellerBooks.forEach(book => {
      const sales = book.salesCount || 0;
      totalSalesCount += sales;
      totalRevenue += sales * book.price;
    });

    const factor = period === '7d' ? 0.25 : period === 'month' ? 0.65 : period === 'year' ? 0.95 : 1.0;

    return {
      salesCount: Math.round(totalSalesCount * factor),
      revenue: Number((totalRevenue * factor).toFixed(2)),
      publishedCount: sellerBooks.filter(book => book.status === 'published').length,
      pendingCount: sellerBooks.filter(book => book.status === 'pending_review').length,
      draftCount: sellerBooks.filter(book => book.status === 'draft').length,
      rejectedCount: sellerBooks.filter(book => book.status === 'rejected').length,
      withdrawnCount: sellerBooks.filter(book => book.status === 'withdrawn').length,
    };
  }, [sellerBooks, period]);

  const handleEdit = (book: Book) => setEditor({ book });

  const handleSendDraftForReview = async (book: Book) => {
    await saveBook({ ...book }, true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Store className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Panel del Vendedor</h1>
          </div>
          <p className="text-xs text-slate-500">
            Gestiona tus publicaciones, revisa estados de moderación y monitorea tus estadísticas de ventas.
          </p>
        </div>

        <button
          onClick={() => setEditor({ book: null })}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Nuevo Libro</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Estadísticas de Venta y Facturación</h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                period === '7d' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                period === 'month' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1 rounded-lg transition-all ${
                period === 'year' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Este Año
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                period === 'all' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Histórico Total
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Ingresos Estimados</span>
            <p className="text-2xl font-black text-slate-900">${stats.revenue.toFixed(2)}</p>
            <p className="text-[10px] text-emerald-800/80 font-medium">Facturación del período seleccionado</p>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Ventas Concretadas</span>
            <p className="text-2xl font-black text-slate-900">{stats.salesCount} u.</p>
            <p className="text-[10px] text-blue-800/80 font-medium">Ejemplares vendidos</p>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">En Revisión</span>
            <p className="text-2xl font-black text-slate-900">{stats.pendingCount}</p>
            <p className="text-[10px] text-amber-800/80 font-medium">Esperando aprobación de admin</p>
          </div>

          <div className="p-4 bg-purple-50/70 border border-purple-200/60 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Activos en Catálogo</span>
            <p className="text-2xl font-black text-slate-900">{stats.publishedCount}</p>
            <p className="text-[10px] text-purple-800/80 font-medium">Disponibles para compra pública</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Mis Publicaciones</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {sellerBooks.length}
            </span>
          </div>
        </div>

        {sellerBooks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-500 text-sm">Aún no has cargado ningún libro a la plataforma.</p>
            <button
              onClick={() => setEditor({ book: null })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar tu primer libro</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Libro</th>
                  <th className="px-6 py-3.5">Precio</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">Ventas</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellerBooks.map(book => (
                  <tr key={book.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded shadow-2xs border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{book.title}</p>
                          <p className="text-slate-500 text-[11px] truncate">{book.author}</p>
                          <span className="text-[10px] text-slate-400 font-mono">ISBN: {book.isbn}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">${book.price.toFixed(2)}</td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {book.status === 'published' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Publicado</span>
                          </span>
                        )}

                        {book.status === 'pending_review' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            <span>En Revisión Admin</span>
                          </span>
                        )}

                        {book.status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Borrador</span>
                          </span>
                        )}

                        {book.status === 'rejected' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Rechazado</span>
                            </span>
                            {book.rejectionReason && (
                              <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                <strong>Motivo de rechazo:</strong> {book.rejectionReason}
                              </p>
                            )}
                          </div>
                        )}

                        {book.status === 'withdrawn' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                            <Archive className="w-3.5 h-3.5 text-slate-600" />
                            <span>Retirado de venta</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">{book.salesCount || 0}</span>
                      <span className="text-slate-400 text-[11px]"> ventas</span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(book.status === 'draft' || book.status === 'rejected') && (
                          <button
                            onClick={() => handleSendDraftForReview(book)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                            title="Enviar a revisión del administrador"
                          >
                            Enviar a Revisión
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(book)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar libro propio"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {book.status === 'published' && (
                          <button
                            onClick={() => withdrawBook(book.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Retirar de la venta (Mantiene acceso a compradores en su biblioteca)"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && <CreateBookModal bookToEdit={editor.book} onClose={() => setEditor(null)} />}
    </div>
  );
};
