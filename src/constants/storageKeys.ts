const PREFIX = 'mercadolibros_v2_';

export const STORAGE_KEYS = {
  users: `${PREFIX}users`,
  session: `${PREFIX}session`,
  books: `${PREFIX}books`,
  bookContents: `${PREFIX}book_contents`,
  reviews: `${PREFIX}reviews`,
  reports: `${PREFIX}reports`,
  favorites: `${PREFIX}favorites`,
  library: `${PREFIX}library`,
  orders: `${PREFIX}orders`,
  cart: `${PREFIX}cart`,
  readerSettings: `${PREFIX}reader`,
} as const;
