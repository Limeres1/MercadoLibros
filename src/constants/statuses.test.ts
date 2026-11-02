import { describe, expect, it } from 'vitest';

import { BOOK_STATUS_TRANSITIONS, canTransition, ORDER_STATUS_TRANSITIONS } from '@/constants/statuses';

describe('book status transitions', () => {
  it('only lets moderation publish a book under review', () => {
    expect(canTransition(BOOK_STATUS_TRANSITIONS, 'pending_review', 'published')).toBe(true);
    expect(canTransition(BOOK_STATUS_TRANSITIONS, 'draft', 'published')).toBe(false);
  });

  it('sends an edited published book back to review', () => {
    expect(canTransition(BOOK_STATUS_TRANSITIONS, 'published', 'pending_review')).toBe(true);
  });
});

describe('order status transitions', () => {
  it('treats paid as final and still accepts a late approved payment', () => {
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'pending', 'paid')).toBe(true);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'pending', 'cancelled')).toBe(true);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'paid', 'rejected')).toBe(false);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'paid', 'cancelled')).toBe(false);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'rejected', 'paid')).toBe(true);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'cancelled', 'paid')).toBe(true);
    expect(canTransition(ORDER_STATUS_TRANSITIONS, 'cancelled', 'pending')).toBe(false);
  });
});
