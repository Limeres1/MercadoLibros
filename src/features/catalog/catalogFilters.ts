import { CATALOG_SORTS, CatalogSort, DEFAULT_CATALOG_SORT } from '@/constants/catalog';
import { CATALOG_PARAMS } from '@/constants/routes';
import { BOOK_CONDITIONS } from '@/constants/statuses';
import { isbnToken, tokenizeQuery } from '@/lib/searchTokens';
import { Book, BookCondition } from '@/types';

export interface CatalogFilters {
  search: string;
  genre: string;
  language: string;
  condition: BookCondition | '';
  minPrice: number | null;
  maxPrice: number | null;
  sort: CatalogSort;
}

export const isOutOfStock = (book: Book) => book.condition !== 'digital' && book.stock !== undefined && book.stock <= 0;

const readPrice = (value: string | null) => {
  if (value === null || value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

const isSort = (value: string | null): value is CatalogSort =>
  Object.values(CATALOG_SORTS).includes(value as CatalogSort);

const isCondition = (value: string | null): value is BookCondition => BOOK_CONDITIONS.includes(value as BookCondition);

export function readCatalogFilters(params: URLSearchParams): CatalogFilters {
  const sort = params.get(CATALOG_PARAMS.sort);
  const condition = params.get(CATALOG_PARAMS.condition);
  return {
    search: params.get(CATALOG_PARAMS.search) ?? '',
    genre: params.get(CATALOG_PARAMS.genre) ?? '',
    language: params.get(CATALOG_PARAMS.language) ?? '',
    condition: isCondition(condition) ? condition : '',
    minPrice: readPrice(params.get(CATALOG_PARAMS.minPrice)),
    maxPrice: readPrice(params.get(CATALOG_PARAMS.maxPrice)),
    sort: isSort(sort) ? sort : DEFAULT_CATALOG_SORT,
  };
}

export const countActiveFilters = (filters: CatalogFilters) =>
  [filters.search, filters.genre, filters.language, filters.condition].filter(Boolean).length +
  [filters.minPrice, filters.maxPrice].filter(price => price !== null).length;

type SortableField = 'rating' | 'createdAt' | 'price' | 'publicationYear';

export interface CatalogQueryPlan {
  equals: [field: 'status' | 'genre' | 'language' | 'condition', value: string][];
  searchToken: string | null;
  priceRange: { min: number | null; max: number | null } | null;
  orderBy: { field: SortableField; direction: 'asc' | 'desc' };
  clientFilter: (book: Book) => boolean;
  isExact: boolean;
}

const SORT_ORDER: Record<CatalogSort, CatalogQueryPlan['orderBy']> = {
  [CATALOG_SORTS.rating]: { field: 'rating', direction: 'desc' },
  [CATALOG_SORTS.newest]: { field: 'createdAt', direction: 'desc' },
  [CATALOG_SORTS.priceAsc]: { field: 'price', direction: 'asc' },
  [CATALOG_SORTS.priceDesc]: { field: 'price', direction: 'desc' },
  [CATALOG_SORTS.year]: { field: 'publicationYear', direction: 'desc' },
};

export function planCatalogQuery(filters: CatalogFilters): CatalogQueryPlan {
  const orderBy = SORT_ORDER[filters.sort];
  const isbn = isbnToken(filters.search);
  const words = isbn ? [isbn] : tokenizeQuery(filters.search);
  const searchToken = words.reduce<string | null>(
    (longest, word) => (!longest || word.length > longest.length ? word : longest),
    null,
  );
  const otherWords = words.filter(word => word !== searchToken);
  const hasPrice = filters.minPrice !== null || filters.maxPrice !== null;
  const priceOnServer = hasPrice && orderBy.field === 'price';
  const filterPriceOnClient = hasPrice && !priceOnServer;

  const equals: CatalogQueryPlan['equals'] = [['status', 'published']];
  if (filters.genre) equals.push(['genre', filters.genre]);
  if (filters.language) equals.push(['language', filters.language]);
  if (filters.condition) equals.push(['condition', filters.condition]);

  return {
    equals,
    searchToken,
    priceRange: priceOnServer ? { min: filters.minPrice, max: filters.maxPrice } : null,
    orderBy,
    isExact: otherWords.length === 0 && !filterPriceOnClient,
    clientFilter: book =>
      otherWords.every(word => book.searchTokens?.includes(word)) &&
      (!filterPriceOnClient ||
        ((filters.minPrice === null || book.price >= filters.minPrice) &&
          (filters.maxPrice === null || book.price <= filters.maxPrice))),
  };
}
