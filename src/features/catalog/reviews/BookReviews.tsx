import React, { useEffect, useState } from 'react';
import { Edit3, MessageSquarePlus, ShieldAlert, Star, Trash2 } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { ReportTarget } from '@/features/catalog/reports/ReportsProvider';
import { bookRatingStats, useReviews } from '@/features/catalog/reviews/ReviewsProvider';
import { formatDate } from '@/lib/format';
import { Book, Review } from '@/types';

interface BookReviewsProps {
  book: Book;
  onReport: (target: ReportTarget) => void;
}

export const BookReviews: React.FC<BookReviewsProps> = ({ book, onReport }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const { reviews, isLoading, canReview, addReview, editReview, removeReview } = useReviews();
  const [isBuyer, setIsBuyer] = useState(false);

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    let isActive = true;
    canReview(book.id).then(result => {
      if (isActive) setIsBuyer(result);
    });
    return () => {
      isActive = false;
    };
  }, [book.id, canReview]);

  const bookReviews = reviews.filter(review => review.bookId === book.id);
  const { rating: averageRating } = bookRatingStats(bookReviews);
  const starCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: bookReviews.filter(review => review.rating === stars).length,
  }));
  const userExistingReview = currentUser ? bookReviews.find(review => review.userId === currentUser.id) : null;

  const handleCreateReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim()) {
      showToast('Por favor escribe tu opinión literaria.', 'error');
      return;
    }
    setIsSubmittingReview(true);
    if (await addReview(book.id, newRating, newComment.trim())) setNewComment('');
    setIsSubmittingReview(false);
  };

  const startEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleSaveEditedReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingReviewId || !editComment.trim()) return;
    if (await editReview(editingReviewId, editRating, editComment.trim())) setEditingReviewId(null);
  };

  return (
    <section aria-label="Reseñas" className="border-t border-slate-200 pt-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reseñas</h2>
          <p className="text-sm text-slate-500">Opiniones de lectores que compraron este libro.</p>
        </div>
        {bookReviews.length > 0 && (
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-4xl font-extrabold tabular-nums text-slate-900">{averageRating.toFixed(1)}</p>
              <div className="mt-1 flex text-amber-400" aria-hidden="true">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${star <= Math.round(averageRating) ? 'fill-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {bookReviews.length} {bookReviews.length === 1 ? 'reseña' : 'reseñas'}
              </p>
            </div>
            <ul className="w-44 space-y-1" aria-label="Distribución de puntajes">
              {starCounts.map(({ stars, count }) => (
                <li key={stars} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-3 tabular-nums">{stars}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${(count / bookReviews.length) * 100}%` }}
                    />
                  </span>
                  <span className="w-5 text-right tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {currentUser && !userExistingReview && !isBuyer && (
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Podés dejar una reseña después de comprar este libro.
        </p>
      )}

      {currentUser && !userExistingReview && isBuyer && (
        <form onSubmit={handleCreateReview} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MessageSquarePlus className="w-4 h-4 text-amber-600" />
              <span>Deja tu valoración de esta obra</span>
            </h4>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setNewRating(star)}
                  className="text-amber-400 hover:scale-110 transition-transform p-0.5"
                >
                  <Star className={`w-5 h-5 ${star <= newRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={3}
            placeholder="Comparte tu experiencia de lectura, calidad de la edición o reflexiones sobre la obra..."
            value={newComment}
            onChange={event => setNewComment(event.target.value)}
            className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none text-slate-800"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingReview}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Publicar Reseña
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando reseñas…</p>
        ) : bookReviews.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <MessageSquarePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Aún no hay reseñas para este libro</p>
            <p className="text-xs text-slate-400">Sé el primero en compartir tu opinión tras leerlo.</p>
          </div>
        ) : (
          bookReviews.map(rev => (
            <div
              key={rev.id}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
            >
              {editingReviewId === rev.id ? (
                <form onSubmit={handleSaveEditedReview} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">Editando reseña</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setEditRating(star)}
                          className="p-0.5 text-amber-400"
                        >
                          <Star className={`w-4 h-4 ${star <= editRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={editComment}
                    onChange={event => setEditComment(event.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingReviewId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          rev.userPhoto ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
                        }
                        alt={rev.userName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{rev.userName}</p>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${star <= rev.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                              />
                            ))}
                          </div>
                          <span>•</span>
                          <span>{formatDate(rev.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {currentUser && (currentUser.id === rev.userId || currentUser.role === 'admin') ? (
                        <>
                          {currentUser.id === rev.userId && (
                            <button
                              onClick={() => startEditReview(rev)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-slate-50"
                              title="Editar mi reseña"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeReview(rev.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50"
                            title="Eliminar reseña"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            onReport({
                              type: 'review',
                              id: rev.id,
                              title: `Reseña de ${rev.userName} sobre ${book.title}`,
                            })
                          }
                          className="p-1 text-slate-300 hover:text-red-500 rounded"
                          aria-label="Denunciar reseña inapropiada"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans pl-9">{rev.comment}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
