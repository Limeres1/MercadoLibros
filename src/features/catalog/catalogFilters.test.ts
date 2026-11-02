import { describe, expect, it } from 'vitest';

import { CATALOG_SORTS } from '@/constants/catalog';
import { CATALOG_PARAMS } from '@/constants/routes';
import { INITIAL_BOOKS } from '@/data/initialData';
import {
  CatalogFilters,
  countActiveFilters,
  planCatalogQuery,
  readCatalogFilters,
} from '@/features/catalog/catalogFilters';
import { buildSearchTokens } from '@/lib/searchTokens';
import { Book } from '@/types';

const baseFilters = readCatalogFilters(new URLSearchParams());
const filtersWith = (overrides: Partial<CatalogFilters>) => ({ ...baseFilters, ...overrides });
const withTokens = (book: Book): Book => ({ ...book, searchTokens: buildSearchTokens(book) });
const [cienAnos] = INITIAL_BOOKS.map(withTokens);

describe('catalog query plan', () => {
  it('CA-1: always asks Firestore only for published books', () => {
    expect(planCatalogQuery(baseFilters).equals).toEqual([['status', 'published']]);
  });

  it('sends genre, language and format as equality filters', () => {
    const plan = planCatalogQuery(filtersWith({ genre: 'Novela', language: 'Español', condition: 'usado' }));
    expect(plan.equals).toEqual([
      ['status', 'published'],
      ['genre', 'Novela'],
      ['language', 'Español'],
      ['condition', 'usado'],
    ]);
    expect(plan.isExact).toBe(true);
  });

  it('searches with the longest word on the server and checks the rest in the browser', () => {
    const plan = planCatalogQuery(filtersWith({ search: 'Gabriel García' }));
    expect(plan.searchToken).toBe('gabriel');
    expect(plan.clientFilter(cienAnos)).toBe(true);
    expect(
      plan.clientFilter({ ...cienAnos, searchTokens: buildSearchTokens({ title: 'Otro', author: 'Gabriel Ruiz' }) }),
    ).toBe(false);
    expect(plan.isExact).toBe(false);
  });

  it('finds books by isbn with dashes', () => {
    expect(planCatalogQuery(filtersWith({ search: '978-0307474728' })).searchToken).toBe('9780307474728');
  });

  it('CA-2: filters price on the server when sorting by price', () => {
    const plan = planCatalogQuery(filtersWith({ minPrice: 10, maxPrice: 120, sort: CATALOG_SORTS.priceAsc }));
    expect(plan.priceRange).toEqual({ min: 10, max: 120 });
    expect(plan.orderBy).toEqual({ field: 'price', direction: 'asc' });
  });

  it('filters price in the browser when sorting by another field', () => {
    const plan = planCatalogQuery(filtersWith({ maxPrice: 15, sort: CATALOG_SORTS.rating }));
    expect(plan.priceRange).toBeNull();
    expect(plan.clientFilter({ ...cienAnos, price: 14 })).toBe(true);
    expect(plan.clientFilter({ ...cienAnos, price: 16 })).toBe(false);
  });

  it('maps every sort option to a Firestore order', () => {
    expect(planCatalogQuery(filtersWith({ sort: CATALOG_SORTS.newest })).orderBy).toEqual({
      field: 'createdAt',
      direction: 'desc',
    });
    expect(planCatalogQuery(filtersWith({ sort: CATALOG_SORTS.year })).orderBy.field).toBe('publicationYear');
  });

  it('reads filters from the url and ignores invalid values', () => {
    const params = new URLSearchParams({
      [CATALOG_PARAMS.condition]: 'pirata',
      [CATALOG_PARAMS.sort]: 'cualquiera',
      [CATALOG_PARAMS.minPrice]: '-3',
      [CATALOG_PARAMS.maxPrice]: '25',
      [CATALOG_PARAMS.genre]: 'Ensayo',
    });
    const filters = readCatalogFilters(params);
    expect(filters).toMatchObject({ condition: '', sort: baseFilters.sort, minPrice: null, maxPrice: 25 });
    expect(countActiveFilters(filters)).toBe(2);
  });
});
