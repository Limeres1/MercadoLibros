const PREFIX = 'mercadolibros_v2_';

export const STORAGE_KEYS = {
  books: `${PREFIX}books`,
  bookContents: `${PREFIX}book_contents`,
  reviews: `${PREFIX}reviews`,
  reports: `${PREFIX}reports`,
  favorites: `${PREFIX}favorites`,
  library: `${PREFIX}library`,
  orders: `${PREFIX}orders`,
  readerSettings: `${PREFIX}reader`,
} as const;
