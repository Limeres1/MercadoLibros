import React from 'react';
import { Review } from '../../../types';
import { INITIAL_REVIEWS } from '../../../data/initialData';
import { createSafeContext } from '../../../lib/createSafeContext';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { useToast } from '../../../components/ui/Toast';
import { useSession } from '../../auth/SessionProvider';
import { useBooks } from '../BooksProvider';
import { STORAGE_KEYS } from '../../../constants/storageKeys';

interface ReviewsContextValue {
  reviews: Review[];
  addReview: (bookId: string, rating: number, comment: string) => Promise<void>;
  editReview: (reviewId: string, rating: number, comment: string) => Promise<void>;
  removeReview: (reviewId: string) => Promise<void>;
}

const [Provider, useReviews] = createSafeContext<ReviewsContextValue>('useReviews');
export { useReviews };

export const ReviewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { updateBook } = useBooks();
  const { showToast } = useToast();
  const [reviews, setReviews] = usePersistentState<Review[]>(STORAGE_KEYS.reviews, INITIAL_REVIEWS);

  const saveAndRecalculate = (next: Review[], bookId: string) => {
    setReviews(next);
    const bookReviews = next.filter(r => r.bookId === bookId);
    const rating = bookReviews.length
      ? Number((bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length).toFixed(1))
      : 0;
    updateBook(bookId, { rating, reviewCount: bookReviews.length });
  };

  const addReview = async (bookId: string, rating: number, comment: string) => {
    if (!currentUser) return;
    const review: Review = {
      id: 'rev_' + Date.now(),
      bookId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    saveAndRecalculate([review, ...reviews], bookId);
    showToast('¡Tu reseña ha sido publicada!', 'success');
  };

  const editReview = async (reviewId: string, rating: number, comment: string) => {
    const target = reviews.find(r => r.id === reviewId);
    if (!target) return;
    saveAndRecalculate(
      reviews.map(r => (r.id === reviewId ? { ...r, rating, comment, updatedAt: new Date().toISOString() } : r)),
      target.bookId
    );
    showToast('Reseña actualizada.', 'success');
  };

  const removeReview = async (reviewId: string) => {
    const target = reviews.find(r => r.id === reviewId);
    if (!target) return;
    saveAndRecalculate(
      reviews.filter(r => r.id !== reviewId),
      target.bookId
    );
    showToast('Reseña eliminada.', 'info');
  };

  return <Provider value={{ reviews, addReview, editReview, removeReview }}>{children}</Provider>;
};
