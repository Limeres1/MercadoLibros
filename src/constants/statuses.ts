export const ACCOUNT_ROLES = ['buyer', 'seller', 'admin'] as const;

export const SIGNUP_ROLES = ['buyer', 'seller'] as const;

export const BOOK_CONDITIONS = ['digital', 'nuevo', 'usado'] as const;

export const BOOK_CONDITION_LABELS: Record<(typeof BOOK_CONDITIONS)[number], string> = {
  digital: 'Digital',
  nuevo: 'Nuevo',
  usado: 'Usado',
};

export const BOOK_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'withdrawn'] as const;

export const BOOK_STATUS_TRANSITIONS: Record<
  (typeof BOOK_STATUSES)[number],
  readonly (typeof BOOK_STATUSES)[number][]
> = {
  draft: ['pending_review'],
  pending_review: ['published', 'rejected'],
  published: ['pending_review', 'withdrawn'],
  rejected: ['pending_review'],
  withdrawn: ['pending_review'],
};

export const ORDER_STATUSES = ['pending', 'paid', 'rejected'] as const;

export const ORDER_STATUS_TRANSITIONS: Record<
  (typeof ORDER_STATUSES)[number],
  readonly (typeof ORDER_STATUSES)[number][]
> = {
  pending: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

export const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'] as const;

export const REPORT_TARGET_TYPES = ['book', 'review'] as const;

export const AUDIT_ACTIONS = [
  'approve_book',
  'reject_book',
  'withdraw_book',
  'delete_review',
  'resolve_report',
  'dismiss_report',
  'block_user',
  'unblock_user',
] as const;

export const READER_THEMES = ['light', 'sepia', 'dark'] as const;

export const FAVORITE_SHOWCASE_LIMIT = 4;

export const SHIPPING_COST = 4.5;

export const MAX_CART_QUANTITY = 10;

export function canTransition<S extends string>(transitions: Record<S, readonly S[]>, from: S, to: S) {
  return transitions[from].includes(to);
}
