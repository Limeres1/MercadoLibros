import { describe, expect, it, vi } from 'vitest';

import { bookRatingStats, sortReviews } from '@/features/catalog/reviews/reviewsService';
import { Review } from '@/types';

vi.mock('@/services/firebase', () => ({ db: {} }));

const review = (id: string, userId: string, rating: number, createdAt: string): Review => ({
  id,
  bookId: 'book_1',
  userId,
  userName: userId,
  rating,
  comment: 'ok',
  createdAt,
});

describe('reviews service', () => {
  it('CA-3: recalculates average and count', () => {
    expect(bookRatingStats([])).toEqual({ rating: 0, reviewCount: 0 });
    expect(bookRatingStats([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ rating: 4.3, reviewCount: 3 });
  });

  it('shows the own review first and then the newest', () => {
    const sorted = sortReviews(
      [
        review('a', 'ana', 5, '2026-10-01T00:00:00.000Z'),
        review('b', 'me', 3, '2026-09-01T00:00:00.000Z'),
        review('c', 'carlos', 4, '2026-10-10T00:00:00.000Z'),
      ],
      'me',
    );
    expect(sorted.map(item => item.id)).toEqual(['b', 'c', 'a']);
  });
});
