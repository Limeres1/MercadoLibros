import React from 'react';
import { Link } from 'react-router';
import { Check, Heart, ShoppingBag, Star } from 'lucide-react';

import { paths } from '@/constants/routes';
import { BOOK_CONDITION_LABELS } from '@/constants/statuses';
import { isOutOfStock } from '@/features/catalog/catalogFilters';
import { formatPrice, formatRating } from '@/lib/format';
import { Book } from '@/types';

const CONDITION_STYLES: Record<Book['condition'], string> = {
  digital: 'bg-indigo-600',
  nuevo: 'bg-emerald-600',
  usado: 'bg-amber-700',
};

interface BookCardProps {
  book: Book;
  cartQuantity: number;
  isFavorite: boolean;
  onToggleFavorite: (book: Book) => void;
  onAddToCart: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  cartQuantity,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}) => {
  const soldOut = isOutOfStock(book);

  return (
    <article className="group relative flex w-full flex-col">
      <Link
        to={paths.book(book.id)}
        className="relative block aspect-2/3 overflow-hidden rounded-r-md rounded-l-sm bg-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.12),0_8px_20px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5 transition-shadow duration-200 group-hover:shadow-[0_2px_4px_rgba(15,23,42,0.12),0_16px_32px_-12px_rgba(15,23,42,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      >
        <img src={book.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/30 via-black/10 to-transparent"
        />
        <span
          className={`absolute bottom-2 left-3 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${CONDITION_STYLES[book.condition]}`}
        >
          {BOOK_CONDITION_LABELS[book.condition]}
        </span>
        {soldOut && (
          <span className="absolute inset-x-0 top-0 bg-slate-900/80 py-1 text-center text-xs font-semibold text-white">
            Sin stock
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => onToggleFavorite(book)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Quitar ${book.title} de favoritos` : `Agregar ${book.title} a favoritos`}
        className={`absolute right-2 top-2 rounded-full p-2 shadow-sm backdrop-blur transition-colors focus-visible:outline-2 focus-visible:outline-amber-600 ${
          isFavorite ? 'bg-rose-500 text-white' : 'bg-white/85 text-slate-600 hover:text-rose-500'
        }`}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>

      <div className="flex flex-1 flex-col pt-3">
        <h3 className="font-serif text-[15px] font-semibold leading-snug text-slate-900">
          <Link to={paths.book(book.id)} className="line-clamp-2 hover:text-amber-700">
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{book.author}</p>

        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          {book.reviewCount > 0 ? (
            <>
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold text-slate-800">{formatRating(book.rating)}</span>
              <span>({book.reviewCount})</span>
            </>
          ) : (
            <span>Sin reseñas todavía</span>
          )}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-lg font-extrabold tabular-nums text-slate-900">{formatPrice(book.price)}</span>
          <button
            type="button"
            onClick={() => onAddToCart(book)}
            disabled={soldOut}
            aria-label={`Agregar ${book.title} al carrito`}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white ${
              cartQuantity > 0
                ? 'border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {cartQuantity > 0 ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{cartQuantity > 0 ? `En carrito (${cartQuantity})` : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export const BookCardSkeleton: React.FC = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="aspect-2/3 animate-pulse rounded-md bg-slate-200" />
    <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-slate-200" />
    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
    <div className="mt-4 h-8 w-full animate-pulse rounded bg-slate-200" />
  </div>
);
