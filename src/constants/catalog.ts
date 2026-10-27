export const CATALOG_SORTS = {
  rating: 'valoracion',
  newest: 'recientes',
  priceAsc: 'precio-menor',
  priceDesc: 'precio-mayor',
  year: 'anio',
} as const;

export type CatalogSort = (typeof CATALOG_SORTS)[keyof typeof CATALOG_SORTS];

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  [CATALOG_SORTS.rating]: 'Mejor valorados',
  [CATALOG_SORTS.newest]: 'Recién llegados',
  [CATALOG_SORTS.priceAsc]: 'Precio: menor a mayor',
  [CATALOG_SORTS.priceDesc]: 'Precio: mayor a menor',
  [CATALOG_SORTS.year]: 'Año de publicación',
};

export const DEFAULT_CATALOG_SORT: CatalogSort = CATALOG_SORTS.rating;

export const CATALOG_PAGE_SIZE = 24;

export const BOOK_GENRES = [
  'Biografía',
  'Ciencia ficción',
  'Clásico',
  'Crónica',
  'Cuentos',
  'Distopía',
  'Divulgación',
  'Ensayo',
  'Fantasía',
  'Ficción',
  'Historia',
  'Historieta',
  'Infantil',
  'Novela',
  'Novela histórica',
  'Poesía',
  'Policial',
  'Realismo Mágico',
  'Romance',
  'Teatro',
  'Terror',
  'Viajes',
] as const;

export const BOOK_LANGUAGES = ['Español', 'Inglés', 'Portugués', 'Francés', 'Italiano'] as const;
