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

export const CATALOG_PARAMS = {
  search: 'q',
  genre: 'genero',
  language: 'idioma',
  condition: 'formato',
  minPrice: 'desde',
  maxPrice: 'hasta',
  sort: 'orden',
} as const;

export const SEARCH_PARAM = CATALOG_PARAMS.search;

export type CatalogParam = (typeof CATALOG_PARAMS)[keyof typeof CATALOG_PARAMS];

export const paths = {
  home: (search?: string) =>
    search ? `${ROUTES.home}?${new URLSearchParams({ [SEARCH_PARAM]: search })}` : ROUTES.home,
  catalog: (params: Partial<Record<CatalogParam, string>>) => {
    const query = new URLSearchParams(params).toString();
    return query ? `${ROUTES.home}?${query}` : ROUTES.home;
  },
  book: (bookId: string) => generatePath(ROUTES.book, { bookId }),
  reader: (bookId: string) => generatePath(ROUTES.reader, { bookId }),
};
