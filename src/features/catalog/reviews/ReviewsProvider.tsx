import React, { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { docIds } from '@/constants/firestore';
import { useSession } from '@/features/auth/SessionProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { db } from '@/services/firebase';
import { firestoreRefs } from '@/services/firestore';
import { Review } from '@/types';

interface ReviewsContextValue {
  reviews: Review[];
  isLoading: boolean;
  canReview: (bookId: string) => Promise<boolean>;
  addReview: (bookId: string, rating: number, comment: string) => Promise<boolean>;
  editReview: (reviewId: string, rating: number, comment: string) => Promise<boolean>;
  removeReview: (reviewId: string) => Promise<boolean>;
}

const [Provider, useReviews] = createSafeContext<ReviewsContextValue>('useReviews');
export { useReviews };

export const bookRatingStats = (bookReviews: Review[]) => ({
  reviewCount: bookReviews.length,
  rating: bookReviews.length
    ? Number((bookReviews.reduce((sum, review) => sum + review.rating, 0) / bookReviews.length).toFixed(1))
    : 0,
});

export const ReviewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(
    () =>
      onSnapshot(
        firestoreRefs.reviews(),
        snapshot => {
          setReviews(
            snapshot.docs
              .map(reviewDoc => reviewDoc.data())
              .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
          );
          setIsLoading(false);
        },
        error => {
          showToastRef.current(getErrorMessage(error), 'error');
          setIsLoading(false);
        },
      ),
    [],
  );

  const userId = currentUser?.id;

  const canReview = useCallback(
    async (bookId: string) => {
      if (!userId) return false;
      const libraryItem = await getDoc(doc(firestoreRefs.library(userId), bookId)).catch(() => null);
      return Boolean(libraryItem?.exists());
    },
    [userId],
  );

  const saveWithStats = async (
    bookId: string,
    nextBookReviews: Review[],
    change: (batch: ReturnType<typeof writeBatch>) => void,
  ) => {
    try {
      const batch = writeBatch(db);
      change(batch);
      batch.update(firestoreRefs.book(bookId), bookRatingStats(nextBookReviews));
      await batch.commit();
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const addReview = async (bookId: string, rating: number, comment: string) => {
    if (!currentUser) return false;
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
    const others = reviews.filter(existing => existing.bookId === bookId && existing.id !== review.id);
    const saved = await saveWithStats(bookId, [review, ...others], batch =>
      batch.set(doc(firestoreRefs.reviews(), review.id), review),
    );
    if (saved) showToast('Tu reseña fue publicada.', 'success');
    return saved;
  };

  const editReview = async (reviewId: string, rating: number, comment: string) => {
    const target = reviews.find(review => review.id === reviewId);
    if (!target) return false;
    const updated = { ...target, rating, comment, updatedAt: new Date().toISOString() };
    const bookReviews = reviews.filter(review => review.bookId === target.bookId);
    const saved = await saveWithStats(
      target.bookId,
      bookReviews.map(review => (review.id === reviewId ? updated : review)),
      batch => batch.update(doc(firestoreRefs.reviews(), reviewId), { rating, comment, updatedAt: updated.updatedAt }),
    );
    if (saved) showToast('Reseña actualizada.', 'success');
    return saved;
  };

  const removeReview = async (reviewId: string) => {
    const target = reviews.find(review => review.id === reviewId);
    if (!target) return false;
    const saved = await saveWithStats(
      target.bookId,
      reviews.filter(review => review.bookId === target.bookId && review.id !== reviewId),
      batch => batch.delete(doc(firestoreRefs.reviews(), reviewId)),
    );
    if (saved) showToast('Reseña eliminada.', 'info');
    return saved;
  };

  return <Provider value={{ reviews, isLoading, canReview, addReview, editReview, removeReview }}>{children}</Provider>;
};
