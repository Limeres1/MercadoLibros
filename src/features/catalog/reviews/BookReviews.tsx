import React, { useState } from 'react';
import { MessageSquarePlus, Pencil, ShieldAlert, Star, Trash2 } from 'lucide-react';

import { useSession } from '@/features/auth/SessionProvider';
import { ReportTarget } from '@/features/catalog/reports/ReportsProvider';
import { bookRatingStats, REVIEW_MAX_LENGTH } from '@/features/catalog/reviews/reviewsService';
import { useBookReviews, useReviewActions } from '@/features/catalog/reviews/useBookReviews';
import { formatDate, formatRating } from '@/lib/format';
import { Book, Review } from '@/types';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
const RATING_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

const Stars: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'h-3.5 w-3.5' }) => (
  <span className="flex text-amber-400" aria-label={`${rating} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        aria-hidden="true"
        className={`${size} ${star <= Math.round(rating) ? 'fill-amber-400' : 'fill-slate-200 text-slate-200'}`}
      />
    ))}
  </span>
);

interface ReviewFormProps {
  initialRating?: number;
  initialComment?: string;
  submitLabel: string;
  onSubmit: (rating: number, comment: string) => Promise<boolean>;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  initialRating = 0,
  initialComment = '',
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setError('Elegí un puntaje de 1 a 5 estrellas.');
      return;
    }
    if (!comment.trim()) {
      setError('Escribí qué te pareció el libro.');
      return;
    }
    setError(null);
    setIsSaving(true);
    const saved = await onSubmit(rating, comment.trim());
    setIsSaving(false);
    if (saved && !initialComment) {
      setRating(0);
      setComment('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Tu puntaje</legend>
        <div className="mt-1 flex items-center gap-2">
          <div role="radiogroup" aria-label="Puntaje" className="flex">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                onClick={() => setRating(star)}
                className="p-0.5 text-amber-400 focus-visible:outline-2 focus-visible:outline-amber-600"
              >
                <Star
                  className={`h-6 w-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-300'}`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-600">{RATING_LABELS[rating]}</span>
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-comment" className="text-sm font-semibold text-slate-900">
          Tu reseña
        </label>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={REVIEW_MAX_LENGTH}
          value={comment}
          onChange={event => setComment(event.target.value)}
          placeholder="¿Qué te pareció la historia, los personajes o la edición?"
          className="mt-1 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
        />
        <p className="text-right text-xs tabular-nums text-slate-400">
          {comment.length}/{REVIEW_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSaving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
};

interface ReviewItemProps {
  review: Review;
  isOwn: boolean;
  canModerate: boolean;
  onEdit: (rating: number, comment: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onReport?: () => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, isOwn, canModerate, onEdit, onDelete, onReport }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (isEditing) {
    return (
      <li>
        <ReviewForm
          initialRating={review.rating}
          initialComment={review.comment}
          submitLabel="Guardar cambios"
          onCancel={() => setIsEditing(false)}
          onSubmit={async (rating, comment) => {
            const saved = await onEdit(rating, comment);
            if (saved) setIsEditing(false);
            return saved;
          }}
        />
      </li>
    );
  }

  return (
    <li className={`rounded-xl border p-4 ${isOwn ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={review.userPhoto || DEFAULT_AVATAR} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {review.userName}
              {isOwn && (
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  Tu reseña
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Stars rating={review.rating} />
              <span>{formatDate(review.createdAt)}</span>
              {review.updatedAt && <span>· editada</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isOwn && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Editar mi reseña"
              className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-amber-700"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {(isOwn || canModerate) && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              aria-label="Eliminar reseña"
              className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {!isOwn && onReport && (
            <button
              type="button"
              onClick={onReport}
              aria-label={`Denunciar la reseña de ${review.userName}`}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-700"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{review.comment}</p>

      {isConfirmingDelete && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
          <span>{isOwn ? '¿Eliminar tu reseña?' : '¿Eliminar esta reseña?'} No se puede deshacer.</span>
          <button
            type="button"
            onClick={async () => {
              if (!(await onDelete())) setIsConfirmingDelete(false);
            }}
            className="rounded-md bg-red-700 px-3 py-1 font-semibold text-white hover:bg-red-800"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(false)}
            className="rounded-md px-3 py-1 font-semibold hover:bg-red-100"
          >
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
};

interface BookReviewsProps {
  book: Book;
  onReport: (target: ReportTarget) => void;
}

export const BookReviews: React.FC<BookReviewsProps> = ({ book, onReport }) => {
  const { currentUser } = useSession();
  const { reviews, ownReview, isLoading, canReview } = useBookReviews(book.id);
  const { addReview, editReview, removeReview } = useReviewActions();
  const { rating: averageRating } = bookRatingStats(reviews);

  return (
    <section aria-labelledby="resenas-titulo" className="space-y-6 border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 id="resenas-titulo" className="text-lg font-bold text-slate-900">
            Reseñas
          </h2>
          <p className="text-sm text-slate-500">Sólo pueden opinar quienes compraron el libro.</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-4xl font-extrabold tabular-nums text-slate-900">{formatRating(averageRating)}</p>
              <Stars rating={averageRating} />
              <p className="mt-1 text-xs text-slate-500">
                {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </p>
            </div>
            <ul className="w-44 space-y-1" aria-label="Distribución de puntajes">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = reviews.filter(review => review.rating === stars).length;
                return (
                  <li key={stars} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-3 tabular-nums">{stars}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-amber-400"
                        style={{ width: `${(count / reviews.length) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 text-right tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {currentUser && !ownReview && canReview && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
            <MessageSquarePlus className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Contá qué te pareció
          </h3>
          <ReviewForm
            submitLabel="Publicar reseña"
            onSubmit={(rating, comment) => addReview(book.id, rating, comment)}
          />
        </div>
      )}

      {currentUser && !ownReview && !canReview && (
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Podés dejar una reseña después de comprar este libro.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando reseñas…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center">
          <MessageSquarePlus className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">Todavía no hay reseñas</p>
          <p className="text-xs text-slate-500">Cuando alguien que lo compró lo comente, lo vas a ver acá.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map(review => (
            <ReviewItem
              key={review.id}
              review={review}
              isOwn={review.userId === currentUser?.id}
              canModerate={currentUser?.role === 'admin'}
              onEdit={(rating, comment) => editReview(review.id, rating, comment)}
              onDelete={() => removeReview(review.id)}
              onReport={
                currentUser
                  ? () =>
                      onReport({
                        type: 'review',
                        id: review.id,
                        title: `Reseña de ${review.userName} sobre ${book.title}`,
                      })
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
};
