export const COLLECTIONS = {
  users: 'users',
  books: 'books',
  bookContents: 'bookContents',
  orders: 'orders',
  reviews: 'reviews',
  reports: 'reports',
  auditLog: 'auditLog',
} as const;

export const USER_SUBCOLLECTIONS = {
  library: 'library',
  favorites: 'favorites',
  cart: 'cart',
  purchases: 'purchases',
} as const;

export const docIds = {
  review: (bookId: string, userId: string) => `${bookId}_${userId}`,
  report: (reporterId: string, targetType: string, targetId: string) => `${reporterId}_${targetType}_${targetId}`,
};
