import React, { useState } from 'react';
import { Link } from 'react-router';
import { Check, CheckCircle2, Eye, X } from 'lucide-react';

import { paths } from '@/constants/routes';
import { BOOK_CONDITION_LABELS } from '@/constants/statuses';
import { EmptyRow, PANEL_CLASS, PanelHeader } from '@/features/admin/AdminUi';
import { ReasonDialog } from '@/features/admin/ReasonDialog';
import { useModeration } from '@/features/admin/useModeration';
import { formatDate, formatPrice } from '@/lib/format';
import { Book } from '@/types';

export const ReviewQueue: React.FC<{ books: Book[] }> = ({ books }) => {
  const { approveBook, rejectBook } = useModeration();
  const [bookToReject, setBookToReject] = useState<Book | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const approve = async (book: Book) => {
    setApprovingId(book.id);
    await approveBook(book);
    setApprovingId(null);
  };

  return (
    <section className={PANEL_CLASS}>
      <PanelHeader
        title={`Libros en revisión (${books.length})`}
        description="Revisá cada ficha antes de que aparezca en el catálogo. Para rechazar, el motivo es obligatorio."
      />
      {books.length === 0 ? (
        <EmptyRow>
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" aria-hidden="true" />
          No hay libros esperando revisión.
        </EmptyRow>
      ) : (
        <ul className="divide-y divide-slate-100">
          {books.map(book => (
            <li key={book.id} className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={book.coverUrl}
                  alt=""
                  className="h-20 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-200 object-cover"
                />
                <div className="min-w-0 space-y-0.5">
                  <h3 className="truncate text-sm font-bold text-slate-900">{book.title}</h3>
                  <p className="text-xs text-slate-600">
                    {book.author} · {book.genre} · {BOOK_CONDITION_LABELS[book.condition]}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {book.sellerName} · {formatPrice(book.price)} · enviado el {formatDate(book.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                <Link
                  to={paths.book(book.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Ver ficha
                </Link>
                <button
                  type="button"
                  onClick={() => setBookToReject(book)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={approvingId === book.id}
                  onClick={() => approve(book)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Aprobar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {bookToReject && (
        <ReasonDialog
          title={`Rechazar «${bookToReject.title}»`}
          description="El vendedor ve este motivo en su panel y puede corregir la ficha y volver a enviarla."
          label="Motivo del rechazo"
          placeholder="Ej.: la portada no corresponde a la edición y falta la sinopsis."
          confirmLabel="Rechazar publicación"
          onConfirm={reason => rejectBook(bookToReject, reason)}
          onClose={() => setBookToReject(null)}
        />
      )}
    </section>
  );
};
