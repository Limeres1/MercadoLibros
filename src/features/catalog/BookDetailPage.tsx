import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Star, ShoppingBag, BookOpen, Heart, ShieldAlert,
  MessageSquarePlus, Edit3, Trash2, User, Globe, BookX
} from 'lucide-react';
import { Book, Review } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useSession } from '../auth/SessionProvider';
import { useRequireLogin } from '../auth/useRequireLogin';
import { useCart } from '../shop/CartProvider';
import { useBooks } from './BooksProvider';
import { useFavorites } from './favorites/FavoritesProvider';
import { useReviews } from './reviews/ReviewsProvider';
import { ReportModal } from './reports/ReportModal';
import { ReportTarget } from './reports/ReportsProvider';
import { SampleReaderModal } from './SampleReaderModal';

export const BookDetailPage: React.FC = () => {
  const { bookId } = useParams();
  const { getBook } = useBooks();
  const { currentUser } = useSession();
  const book = bookId ? getBook(bookId) : undefined;
  const isVisible = book && (book.status === 'published' || currentUser?.role === 'admin' || book.sellerId === currentUser?.id);

  if (!book || !isVisible) {
    return (
      <EmptyState
        icon={BookX}
        title="Libro no encontrado"
        description="El libro que buscás no existe o ya no está disponible."
      />
    );
  }

  return <BookDetail book={book} />;
};

const BookDetail: React.FC<{ book: Book }> = ({ book }) => {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { reviews, addReview, editReview, removeReview } = useReviews();

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const isFav = isFavorite(book.id);

  const openReport = (target: ReportTarget) => {
    if (requireLogin('Debes iniciar sesión para enviar una denuncia.')) setReportTarget(target);
  };

  const bookReviews = reviews.filter(r => r.bookId === book.id);
  const userExistingReview = currentUser ? bookReviews.find(r => r.userId === currentUser.id) : null;

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      showToast('Por favor escribe tu opinión literaria.', 'error');
      return;
    }
    setIsSubmittingReview(true);
    await addReview(book.id, newRating, newComment.trim());
    setNewComment('');
    setIsSubmittingReview(false);
  };

  const startEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleSaveEditedReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReviewId || !editComment.trim()) return;
    await editReview(editingReviewId, editRating, editComment.trim());
    setEditingReviewId(null);
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/80 flex flex-col">

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="text-xs text-slate-500 truncate">ISBN: {book.isbn}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openReport({ type: 'book', id: book.id, title: book.title })}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-xs"
              title="Denunciar este libro"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Denunciar</span>
            </button>

            <button
              onClick={() => toggleFavorite(book.id)}
              className={`p-2 rounded-xl transition-colors ${
                isFav ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
              }`}
              title="Añadir a favoritos"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500' : ''}`} />
            </button>

          </div>
        </div>

        <div className="flex-1 p-4 sm:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="relative group rounded-2xl overflow-hidden shadow-xl border border-slate-200/60 max-w-[240px] w-full aspect-2/3 bg-slate-100">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                  book.condition === 'nuevo' ? 'bg-emerald-600 text-white' :
                  book.condition === 'usado' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                }`}>
                  {book.condition === 'nuevo' ? 'Nuevo' : book.condition === 'usado' ? 'Usado' : 'Digital (eBook)'}
                </span>
              </div>

              <button
                onClick={() => setIsSampleOpen(true)}
                className="mt-4 w-full max-w-[240px] py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-102"
              >
                <BookOpen className="w-4 h-4 text-amber-700" />
                <span>Leer Muestra Gratuita</span>
              </button>
            </div>

            <div className="md:col-span-8 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {book.genre}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-500" />
                    {book.language}
                  </span>
                  <span className="text-xs text-slate-500">
                    {book.publicationYear} • {book.pages} págs
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {book.title}
                </h1>
                <p className="text-base text-slate-600 font-medium mt-1">
                  Por <span className="text-slate-900 font-semibold">{book.author}</span>
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(book.rating) ? 'fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{book.rating > 0 ? book.rating : 'Nuevo'}</span>
                  <span className="text-xs text-slate-500">({book.reviewCount} reseñas comunitarias)</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Precio final de venta:</p>
                  <p className="text-3xl font-black text-slate-950">
                    ${book.price.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    {book.condition === 'digital' ? '⚡ Entrega digital inmediata a tu Biblioteca' : '📦 Envío seguro a domicilio o retiro'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addToCart(book)}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-sm shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Añadir al Carrito</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-500">Publicado por vendedor: </span>
                  <span className="font-bold text-slate-800">{book.sellerName}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Sinopsis de la obra
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {book.description}
                </p>
              </div>

            </div>

          </div>

          <div className="border-t border-slate-200 pt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Reseñas y Calificaciones</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                    {bookReviews.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Opiniones de compradores verificados de Mercado Libros</p>
              </div>
            </div>

            {currentUser && !userExistingReview && (
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
                  onChange={(e) => setNewComment(e.target.value)}
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
              {bookReviews.length === 0 ? (
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
                          onChange={(e) => setEditComment(e.target.value)}
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
                              src={rev.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
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
                                <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {currentUser && (currentUser.id === rev.userId || currentUser.role === 'admin') ? (
                              <>
                                <button
                                  onClick={() => startEditReview(rev)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-slate-50"
                                  title="Editar mi reseña"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
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
                                onClick={() => openReport({ type: 'review', id: rev.id, title: `Reseña de ${rev.userName} sobre ${book.title}` })}
                                className="p-1 text-slate-300 hover:text-red-500 rounded"
                                aria-label="Denunciar reseña inapropiada"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans pl-9">
                          {rev.comment}
                        </p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

      {isSampleOpen && <SampleReaderModal book={book} onClose={() => setIsSampleOpen(false)} />}
      {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />}
    </div>
  );
};
