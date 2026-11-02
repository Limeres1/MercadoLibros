import { useCallback, useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  bookReviewsQuery,
  createReview,
  deleteReview,
  hasPurchased,
  sortReviews,
  updateReview,
} from '@/features/catalog/reviews/reviewsService';
import { getErrorMessage } from '@/lib/errors';
import { Review } from '@/types';

export function useBookReviews(bookId: string) {
  const { currentUser } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const userId = currentUser?.id;

  useEffect(() => {
    setIsLoading(true);
    return onSnapshot(
      bookReviewsQuery(bookId),
      snapshot => {
        setReviews(snapshot.docs.map(reviewDoc => reviewDoc.data()));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [bookId]);

  useEffect(() => {
    let isActive = true;
    if (!userId) {
      setCanReview(false);
      return;
    }
    hasPurchased(userId, bookId)
      .then(result => isActive && setCanReview(result))
      .catch(() => isActive && setCanReview(false));
    return () => {
      isActive = false;
    };
  }, [userId, bookId]);

  return {
    reviews: sortReviews(reviews, userId),
    ownReview: reviews.find(review => review.userId === userId) ?? null,
    isLoading,
    canReview,
  };
}

export function useReviewActions() {
  const { currentUser } = useSession();
  const { showToast } = useToast();

  const run = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      try {
        await action();
        showToast(successMessage, 'success');
        return true;
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
        return false;
      }
    },
    [showToast],
  );

  return {
    addReview: (bookId: string, rating: number, comment: string) =>
      currentUser
        ? run(() => createReview(currentUser, bookId, rating, comment), 'Publicaste tu reseña.')
        : Promise.resolve(false),
    editReview: (reviewId: string, rating: number, comment: string) =>
      run(() => updateReview(reviewId, rating, comment), 'Guardaste los cambios de tu reseña.'),
    removeReview: (reviewId: string) => run(() => deleteReview(reviewId), 'La reseña fue eliminada.'),
  };
}
