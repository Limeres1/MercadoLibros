import { generatePath } from 'react-router';

export const ROUTES = {
  home: '/',
  book: '/libro/:bookId',
  favorites: '/favoritos',
  library: '/biblioteca',
  reader: '/leer/:bookId',
  orders: '/pedidos',
  profile: '/perfil',
  seller: '/vendedor',
  admin: '/admin',
  notFound: '*',
} as const;

export const SEARCH_PARAM = 'q';

export const paths = {
  home: (search?: string) =>
    search ? `${ROUTES.home}?${new URLSearchParams({ [SEARCH_PARAM]: search })}` : ROUTES.home,
  book: (bookId: string) => generatePath(ROUTES.book, { bookId }),
  reader: (bookId: string) => generatePath(ROUTES.reader, { bookId }),
};
