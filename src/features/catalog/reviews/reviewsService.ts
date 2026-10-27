import { doc, getDoc, getDocs, query, where, WriteBatch, writeBatch } from 'firebase/firestore';

import { docIds } from '@/constants/firestore';
import { db } from '@/services/firebase';
import { firestoreRefs } from '@/services/firestore';
import { Review, UserProfile } from '@/types';

export const REVIEW_MAX_LENGTH = 2000;

export const bookRatingStats = (bookReviews: Pick<Review, 'rating'>[]) => ({
  reviewCount: bookReviews.length,
  rating: bookReviews.length
    ? Number((bookReviews.reduce((sum, review) => sum + review.rating, 0) / bookReviews.length).toFixed(1))
    : 0,
});

export const sortReviews = (reviews: Review[], currentUserId?: string) =>
  [...reviews].sort(
    (first, second) =>
      Number(second.userId === currentUserId) - Number(first.userId === currentUserId) ||
      second.createdAt.localeCompare(first.createdAt),
  );

export const bookReviewsQuery = (bookId: string) => query(firestoreRefs.reviews(), where('bookId', '==', bookId));

export async function hasPurchased(userId: string, bookId: string) {
  const results = await Promise.allSettled([
    getDoc(doc(firestoreRefs.purchases(userId), bookId)),
    getDoc(doc(firestoreRefs.library(userId), bookId)),
  ]);
  return results.some(result => result.status === 'fulfilled' && result.value.exists());
}

async function commitWithStats(
  bookId: string,
  change: (batch: WriteBatch) => void,
  nextReviews: (current: Review[]) => Review[],
) {
  const snapshot = await getDocs(bookReviewsQuery(bookId));
  const batch = writeBatch(db);
  change(batch);
  batch.update(
    firestoreRefs.book(bookId),
    bookRatingStats(nextReviews(snapshot.docs.map(reviewDoc => reviewDoc.data()))),
  );
  await batch.commit();
}

export async function createReview(user: UserProfile, bookId: string, rating: number, comment: string) {
  const review: Review = {
    id: docIds.review(bookId, user.id),
    bookId,
    userId: user.id,
    userName: user.displayName,
    userPhoto: user.photoURL,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  await commitWithStats(
    bookId,
    batch => batch.set(doc(firestoreRefs.reviews(), review.id), review),
    current => [...current.filter(existing => existing.id !== review.id), review],
  );
}

async function getReview(reviewId: string) {
  const snapshot = await getDoc(doc(firestoreRefs.reviews(), reviewId));
  if (!snapshot.exists()) throw Object.assign(new Error('Review not found'), { code: 'not-found' });
  return snapshot.data();
}

export async function updateReview(reviewId: string, rating: number, comment: string) {
  const review = await getReview(reviewId);
  const updatedAt = new Date().toISOString();
  await commitWithStats(
    review.bookId,
    batch => batch.update(doc(firestoreRefs.reviews(), reviewId), { rating, comment, updatedAt }),
    current => current.map(existing => (existing.id === reviewId ? { ...existing, rating, comment } : existing)),
  );
}

export async function deleteReview(reviewId: string) {
  const review = await getReview(reviewId);
  await commitWithStats(
    review.bookId,
    batch => batch.delete(doc(firestoreRefs.reviews(), reviewId)),
    current => current.filter(existing => existing.id !== reviewId),
  );
}
