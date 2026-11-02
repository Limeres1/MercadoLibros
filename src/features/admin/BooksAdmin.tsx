import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/constants/routes';
import { BOOK_STATUS_LABELS, BOOK_STATUSES } from '@/constants/statuses';
import { matchesSearch } from '@/features/admin/adminSearch';
import { EmptyRow, PANEL_CLASS, PanelHeader, SearchField, SELECT_CLASS } from '@/features/admin/AdminUi';
import { ReasonDialog } from '@/features/admin/ReasonDialog';
import { useModeration } from '@/features/admin/useModeration';
import { formatPrice } from '@/lib/format';
import { Book, BookStatus } from '@/types';

const STATUS_STYLES: Record<BookStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  withdrawn: 'bg-slate-200 text-slate-800',
};

const ALL = 'all';

export const BooksAdmin: React.FC<{ books: Book[] }> = ({ books }) => {
  const { withdrawBook } = useModeration();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BookStatus | typeof ALL>(ALL);
  const [bookToWithdraw, setBookToWithdraw] = useState<Book | null>(null);

  const results = useMemo(
    () =>
      books
        .filter(book => status === ALL || book.status === status)
        .filter(book => matchesSearch(search, [book.title, book.author, book.isbn, book.sellerName, book.genre]))
        .sort((first, second) => first.title.localeCompare(second.title, 'es')),
    [books, search, status],
  );

  return (
    <section className={PANEL_CLASS}>
      <PanelHeader
        title="Libros"
        description="Buscá cualquier libro, en cualquier estado, por título, autor, ISBN, vendedor o género."
      >
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SearchField
            label="Buscar en todos los libros"
            value={search}
            onChange={setSearch}
            placeholder="Título, autor, ISBN…"
          />
          <label>
            <span className="sr-only">Estado</span>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as BookStatus | typeof ALL)}
              className={SELECT_CLASS}
            >
              <option value={ALL}>Todos los estados</option>
              {BOOK_STATUSES.map(option => (
                <option key={option} value={option}>
                  {BOOK_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PanelHeader>

      <p aria-live="polite" className="px-5 pt-3 text-[11px] text-slate-500">
        {results.length} de {books.length} libros
      </p>

      {results.length === 0 ? (
        <EmptyRow>No hay libros que coincidan con la búsqueda.</EmptyRow>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">Libro</th>
                <th className="px-5 py-3">Vendedor</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Precio</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map(book => (
                <tr key={book.id}>
                  <td className="px-5 py-3">
                    <Link to={paths.book(book.id)} className="font-bold text-slate-900 hover:underline">
                      {book.title}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {book.author}
                      {book.isbn && ` · ISBN ${book.isbn}`}
                    </p>
                  </td>
                  <td className="px-5 py-3">{book.sellerName}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[book.status]}`}>
                      {BOOK_STATUS_LABELS[book.status]}
                    </span>
                    {book.rejectionReason && (book.status === 'rejected' || book.status === 'withdrawn') && (
                      <p className="mt-1 max-w-xs text-[11px] text-slate-500">{book.rejectionReason}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">{formatPrice(book.price)}</td>
                  <td className="px-5 py-3 text-right">
                    {book.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => setBookToWithdraw(book)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Retirar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookToWithdraw && (
        <ReasonDialog
          title={`Retirar «${bookToWithdraw.title}» de la venta`}
          description="Deja de aparecer en el catálogo. Quienes ya lo compraron lo siguen leyendo. El vendedor ve el motivo."
          label="Motivo del retiro"
          placeholder="Ej.: infringe derechos de autor según denuncia de la editorial."
          confirmLabel="Retirar de la venta"
          onConfirm={reason => withdrawBook(bookToWithdraw, reason)}
          onClose={() => setBookToWithdraw(null)}
        />
      )}
    </section>
  );
};
