import React from 'react';

import { useToast } from '@/components/ui/Toast';
import { docIds } from '@/constants/firestore';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_REVIEWS } from '@/data/initialData';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { Review } from '@/types';

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
    const bookReviews = next.filter(review => review.bookId === bookId);
    const rating = bookReviews.length
      ? Number((bookReviews.reduce((sum, review) => sum + review.rating, 0) / bookReviews.length).toFixed(1))
      : 0;
    updateBook(bookId, { rating, reviewCount: bookReviews.length });
  };

  const addReview = async (bookId: string, rating: number, comment: string) => {
    if (!currentUser) return;
    const review: Review = {
      id: docIds.review(bookId, currentUser.id),
      bookId,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    saveAndRecalculate([review, ...reviews.filter(existing => existing.id !== review.id)], bookId);
    showToast('¡Tu reseña ha sido publicada!', 'success');
  };

  const editReview = async (reviewId: string, rating: number, comment: string) => {
    const target = reviews.find(review => review.id === reviewId);
    if (!target) return;
    saveAndRecalculate(
      reviews.map(review =>
        review.id === reviewId ? { ...review, rating, comment, updatedAt: new Date().toISOString() } : review,
      ),
      target.bookId,
    );
    showToast('Reseña actualizada.', 'success');
  };

  const removeReview = async (reviewId: string) => {
    const target = reviews.find(review => review.id === reviewId);
    if (!target) return;
    saveAndRecalculate(
      reviews.filter(review => review.id !== reviewId),
      target.bookId,
    );
    showToast('Reseña eliminada.', 'info');
  };

  return <Provider value={{ reviews, addReview, editReview, removeReview }}>{children}</Provider>;
};
