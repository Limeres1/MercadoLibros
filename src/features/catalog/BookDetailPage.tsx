import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  BookOpen,
  BookX,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Share2,
  ShieldAlert,
  ShoppingBag,
  Star,
} from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useToast } from '@/components/ui/Toast';
import { CATALOG_PARAMS, paths, ROUTES } from '@/constants/routes';
import { BOOK_CONDITION_LABELS } from '@/constants/statuses';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { useBook } from '@/features/catalog/BooksProvider';
import { isOutOfStock } from '@/features/catalog/catalogFilters';
import { useFavorites } from '@/features/catalog/favorites/FavoritesProvider';
import { ReportModal } from '@/features/catalog/reports/ReportModal';
import { ReportTarget } from '@/features/catalog/reports/ReportsProvider';
import { BookReviews } from '@/features/catalog/reviews/BookReviews';
import { SampleReaderModal } from '@/features/catalog/SampleReaderModal';
import { getMaxQuantity, useCart } from '@/features/shop/CartProvider';
import { formatPrice, formatRating } from '@/lib/format';
import { Book } from '@/types';

const STATUS_NOTICES: Partial<Record<Book['status'], string>> = {
  draft: 'Borrador: sólo vos y la administración pueden ver esta ficha.',
  pending_review: 'En revisión: todavía no aparece en el catálogo.',
  rejected: 'Rechazado por la administración: no aparece en el catálogo.',
  withdrawn: 'Retirado de la venta: no aparece en el catálogo.',
};

export const BookDetailPage: React.FC = () => {
  const { bookId } = useParams();
  const { book, isLoading } = useBook(bookId);
  const { currentUser } = useSession();
  const isVisible =
    book && (book.status === 'published' || currentUser?.role === 'admin' || book.sellerId === currentUser?.id);

  if (isLoading && !book) return <PageLoader />;

  if (!book || !isVisible) {
    return (
      <EmptyState
        icon={BookX}
        title="Libro no encontrado"
        description="El libro no existe o ya no está a la venta."
        action={
          <Link
            to={ROUTES.home}
            className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Ir al catálogo
          </Link>
        }
      />
    );
  }

  return <BookDetail key={book.id} book={book} />;
};

const BookDetail: React.FC<{ book: Book }> = ({ book }) => {
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const { addToCart, getCartQuantity, updateCartQuantity, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const isFav = isFavorite(book.id);
  const soldOut = isOutOfStock(book);
  const cartQuantity = getCartQuantity(book.id);
  const maxQuantity = getMaxQuantity(book);
  const statusNotice = STATUS_NOTICES[book.status];

  const openReport = (target: ReportTarget) => {
    if (requireLogin('Iniciá sesión para denunciar contenido.')) setReportTarget(target);
  };

  const shareBook = async () => {
    const url = window.location.origin + paths.book(book.id);
    if (navigator.share) {
      await navigator
        .share({ title: book.title, text: `${book.title}, de ${book.author}`, url })
        .catch(() => undefined);
      return;
    }
    await navigator.clipboard
      .writeText(url)
      .then(() => showToast('Link copiado al portapapeles.', 'success'))
      .catch(() => showToast('No pudimos copiar el link. Copialo desde la barra del navegador.', 'error'));
  };

  const details = [
    { label: 'Autor', value: book.author },
    { label: 'Género', value: book.genre },
    { label: 'Idioma', value: book.language },
    { label: 'Formato', value: BOOK_CONDITION_LABELS[book.condition] },
    { label: 'Páginas', value: String(book.pages) },
    { label: 'Año de publicación', value: String(book.publicationYear) },
    { label: 'ISBN', value: book.isbn || 'Sin ISBN' },
    { label: 'Vendedor', value: book.sellerName },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <nav aria-label="Ruta de navegación">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <Link to={ROUTES.home} className="hover:text-amber-700 hover:underline">
              Catálogo
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li>
            <Link
              to={paths.catalog({ [CATALOG_PARAMS.genre]: book.genre })}
              className="hover:text-amber-700 hover:underline"
            >
              {book.genre}
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li aria-current="page" className="line-clamp-1 max-w-[16rem] text-slate-700">
            {book.title}
          </li>
        </ol>
      </nav>

      {statusNotice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          {statusNotice}
        </p>
      )}

      <article className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr] md:gap-12">
        <div className="mx-auto w-full max-w-[280px] space-y-3">
          <div className="relative aspect-2/3 overflow-hidden rounded-r-lg rounded-l-sm bg-slate-200 shadow-[0_2px_4px_rgba(15,23,42,0.12),0_24px_48px_-16px_rgba(15,23,42,0.5)] ring-1 ring-slate-900/5">
            <img src={book.coverUrl} alt={`Portada de ${book.title}`} className="h-full w-full object-cover" />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-black/10 to-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsSampleOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 hover:border-amber-500 hover:text-amber-800"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Leer muestra gratis
          </button>
        </div>

        <div className="min-w-0 space-y-6">
          <header>
            <h1 className="font-serif text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{book.title}</h1>
            <p className="mt-2 text-lg text-slate-600">{book.author}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
              {book.reviewCount > 0 ? (
                <>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{formatRating(book.rating)}</span>
                  <a href="#resenas" className="hover:underline">
                    {book.reviewCount} {book.reviewCount === 1 ? 'reseña' : 'reseñas'}
                  </a>
                </>
              ) : (
                <span>Sin reseñas todavía</span>
              )}
            </p>
          </header>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900">{formatPrice(book.price)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {book.condition === 'digital'
                ? 'Libro digital: después del pago lo leés en tu biblioteca.'
                : soldOut
                  ? 'Sin stock por el momento.'
                  : `Ejemplar ${BOOK_CONDITION_LABELS[book.condition].toLowerCase()} con envío a domicilio${
                      book.stock !== undefined ? ` · ${book.stock} disponibles` : ''
                    }.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {cartQuantity === 0 ? (
                <button
                  type="button"
                  onClick={() => addToCart(book)}
                  disabled={soldOut}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  Agregar al carrito
                </button>
              ) : (
                <div className="flex flex-1 flex-wrap items-center gap-2 sm:flex-none">
                  {book.condition !== 'digital' && (
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(book.id, cartQuantity - 1)}
                        aria-label="Quitar un ejemplar"
                        className="p-3 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">
                        {cartQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(book.id, cartQuantity + 1)}
                        disabled={cartQuantity >= maxQuantity}
                        aria-label="Sumar un ejemplar"
                        className="p-3 text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={openCart}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 sm:flex-none"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    En tu carrito · Ver carrito
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => toggleFavorite(book.id)}
                aria-pressed={isFav}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                  isFav
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-700'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} aria-hidden="true" />
                {isFav ? 'En favoritos' : 'Favorito'}
              </button>
              <button
                type="button"
                onClick={shareBook}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Compartir
              </button>
            </div>
            {book.condition !== 'digital' && cartQuantity > 0 && cartQuantity >= maxQuantity && (
              <p className="mt-3 text-xs text-slate-500">Ya tenés en el carrito todos los ejemplares disponibles.</p>
            )}
          </div>

          <section aria-labelledby="sinopsis">
            <h2 id="sinopsis" className="text-base font-bold text-slate-900">
              Sinopsis
            </h2>
            <p className="mt-2 max-w-prose whitespace-pre-line font-serif text-[15px] leading-7 text-slate-700">
              {book.description || 'El vendedor todavía no cargó una sinopsis.'}
            </p>
          </section>

          <section aria-labelledby="detalles">
            <h2 id="detalles" className="text-base font-bold text-slate-900">
              Detalles
            </h2>
            <dl className="mt-2 grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 text-sm sm:grid-cols-2 sm:divide-y-0">
              {details.map(detail => (
                <div
                  key={detail.label}
                  className="flex justify-between gap-4 py-2 sm:border-b sm:border-slate-200 sm:pr-6"
                >
                  <dt className="text-slate-500">{detail.label}</dt>
                  <dd className="text-right font-medium text-slate-900">{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <button
            type="button"
            onClick={() => openReport({ type: 'book', id: book.id, title: book.title })}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-700"
          >
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Denunciar esta publicación
          </button>
        </div>
      </article>

      <div id="resenas" className="scroll-mt-24">
        <BookReviews book={book} onReport={openReport} />
      </div>

      {isSampleOpen && <SampleReaderModal book={book} onClose={() => setIsSampleOpen(false)} />}
      {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />}
    </div>
  );
};
