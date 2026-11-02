import React, { useState } from 'react';
import { AlertTriangle, Archive, BookOpen, CheckCircle, Clock, Edit3, Plus, Store } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/features/auth/SessionProvider';
import { CreateBookModal } from '@/features/seller/CreateBookModal';
import { SalesStats } from '@/features/seller/SalesStats';
import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { useSellerOrders } from '@/features/seller/useSellerOrders';
import { Book } from '@/types';

export const SellerDashboard: React.FC = () => {
  const { currentUser } = useSession();
  const { sellerBooks, saveBook, withdrawBook } = useSellerBooks();
  const { orders, isLoading, error } = useSellerOrders();
  const [editor, setEditor] = useState<{ book: Book | null } | null>(null);
  const [bookToWithdraw, setBookToWithdraw] = useState<Book | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleEdit = (book: Book) => setEditor({ book });

  const handleSendDraftForReview = async (book: Book) => {
    await saveBook({ ...book }, true);
  };

  const confirmWithdraw = async () => {
    if (!bookToWithdraw) return;
    setIsWithdrawing(true);
    await withdrawBook(bookToWithdraw.id);
    setIsWithdrawing(false);
    setBookToWithdraw(null);
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

      <SalesStats
        sellerId={currentUser?.id ?? ''}
        orders={orders}
        books={sellerBooks}
        isLoading={isLoading}
        error={error}
      />

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
            <table data-testid="books-table" className="w-full text-left text-xs text-slate-600">
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
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
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
                          data-testid={`edit-book-${book.id}`}
                          onClick={() => handleEdit(book)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar libro propio"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {book.status === 'published' && (
                          <button
                            data-testid={`withdraw-book-${book.id}`}
                            onClick={() => setBookToWithdraw(book)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Retirar de la venta"
                            aria-label={`Retirar de la venta ${book.title}`}
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

      {bookToWithdraw && (
        <Modal onClose={() => !isWithdrawing && setBookToWithdraw(null)} labelledBy="withdraw-title">
          <div className="space-y-4 p-6">
            <h3 id="withdraw-title" className="text-base font-bold text-slate-900">
              ¿Retirar «{bookToWithdraw.title}» de la venta?
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Deja de aparecer en el catálogo y nadie más puede comprarlo.</li>
              <li>Quienes ya lo compraron lo siguen teniendo en su biblioteca y pueden leerlo.</li>
              <li>Para volver a venderlo, editalo y envialo a revisión.</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => setBookToWithdraw(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={confirmWithdraw}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {isWithdrawing ? 'Retirando…' : 'Retirar de la venta'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
