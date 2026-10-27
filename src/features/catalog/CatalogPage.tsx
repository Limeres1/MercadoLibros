import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BookMarked, Loader2, SearchX, SlidersHorizontal, X } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';
import { BOOK_GENRES, CATALOG_SORT_LABELS, CatalogSort, DEFAULT_CATALOG_SORT } from '@/constants/catalog';
import { CATALOG_PARAMS, CatalogParam } from '@/constants/routes';
import { BOOK_CONDITION_LABELS } from '@/constants/statuses';
import { BookCard, BookCardSkeleton } from '@/features/catalog/BookCard';
import { countActiveFilters, readCatalogFilters } from '@/features/catalog/catalogFilters';
import { CatalogFiltersPanel } from '@/features/catalog/CatalogFiltersPanel';
import { useFavorites } from '@/features/catalog/favorites/FavoritesProvider';
import { useCatalogBooks, useCatalogPriceCeiling } from '@/features/catalog/useCatalogBooks';
import { useCart } from '@/features/shop/CartProvider';
import { formatPrice } from '@/lib/format';

const SKELETON_COUNT = 4;

export const CatalogPage: React.FC = () => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, getCartQuantity } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  const filters = useMemo(() => readCatalogFilters(searchParams), [searchParams]);
  const { books: results, total, isLoading, isLoadingMore, hasMore, error, loadMore } = useCatalogBooks(filters);
  const priceCeiling = useCatalogPriceCeiling();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = countActiveFilters(filters);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const setParam = (param: CatalogParam, value: string) =>
    setSearchParams(
      current => {
        const next = new URLSearchParams(current);
        if (value) next.set(param, value);
        else next.delete(param);
        return next;
      },
      { replace: true },
    );

  const clearFilters = () =>
    setSearchParams(
      current => {
        const next = new URLSearchParams();
        const sort = current.get(CATALOG_PARAMS.sort);
        if (sort) next.set(CATALOG_PARAMS.sort, sort);
        return next;
      },
      { replace: true },
    );

  const activeChips: { param: CatalogParam; label: string }[] = [
    { param: CATALOG_PARAMS.search, label: filters.search && `“${filters.search}”` },
    { param: CATALOG_PARAMS.genre, label: filters.genre },
    { param: CATALOG_PARAMS.language, label: filters.language },
    { param: CATALOG_PARAMS.condition, label: filters.condition && BOOK_CONDITION_LABELS[filters.condition] },
    {
      param: CATALOG_PARAMS.minPrice,
      label: filters.minPrice === null ? '' : `Desde ${formatPrice(filters.minPrice)}`,
    },
    {
      param: CATALOG_PARAMS.maxPrice,
      label: filters.maxPrice === null ? '' : `Hasta ${formatPrice(filters.maxPrice)}`,
    },
  ].filter(chip => chip.label);

  const resultsSummary = isLoading
    ? 'Cargando libros…'
    : error
      ? ''
      : total !== null
        ? `${total} ${total === 1 ? 'libro' : 'libros'}`
        : `${results.length}${hasMore ? '+' : ''} ${results.length === 1 ? 'libro' : 'libros'}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">Catálogo</h1>
          <p className="mt-1 text-sm text-slate-500" aria-live="polite">
            {resultsSummary}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setAreFiltersOpen(open => !open)}
            aria-expanded={areFiltersOpen}
            aria-controls="catalog-filters"
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-amber-600 px-1.5 text-xs text-white">{activeFilterCount}</span>
            )}
          </button>
          <label htmlFor="catalog-sort" className="sr-only">
            Ordenar por
          </label>
          <select
            id="catalog-sort"
            value={filters.sort}
            onChange={event =>
              setParam(CATALOG_PARAMS.sort, event.target.value === DEFAULT_CATALOG_SORT ? '' : event.target.value)
            }
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20 sm:flex-none"
          >
            {Object.entries(CATALOG_SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value as CatalogSort}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {
        <nav aria-label="Géneros" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {['', ...BOOK_GENRES].map(genre => {
              const isActive = filters.genre === genre;
              return (
                <li key={genre || 'todos'}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setParam(CATALOG_PARAMS.genre, genre)}
                    className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 ${
                      isActive
                        ? 'border-amber-600 bg-amber-600 font-semibold text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-amber-500 hover:text-amber-800'
                    }`}
                  >
                    {genre || 'Todos'}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      }

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside
          id="catalog-filters"
          aria-label="Filtros"
          className={`${areFiltersOpen ? 'block' : 'hidden'} rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24 lg:block lg:self-start lg:border-0 lg:bg-transparent lg:p-0`}
        >
          <CatalogFiltersPanel filters={filters} priceCeiling={priceCeiling} onChange={setParam} />
        </aside>

        <section aria-label="Resultados" className="min-w-0 space-y-5">
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map(chip => (
                <button
                  key={chip.param}
                  type="button"
                  onClick={() => setParam(chip.param, '')}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="flex items-center gap-1 rounded-full bg-slate-200/70 py-1 pl-3 pr-2 text-sm text-slate-800 hover:bg-slate-300/70"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-amber-700 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4" role="status">
              <span className="sr-only">Cargando libros…</span>
              {Array.from({ length: SKELETON_COUNT }, (_slot, index) => (
                <BookCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={BookMarked} title="No pudimos cargar el catálogo" description={error} />
          ) : results.length === 0 && activeFilterCount === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Todavía no hay libros publicados"
              description="Cuando un vendedor publique su primer libro y lo apruebe la administración, aparecerá acá."
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Ningún libro coincide con tu búsqueda"
              description="Probá con otro título o autor, o quitá algún filtro."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {results.map(book => (
                <li key={book.id} className="flex">
                  <BookCard
                    book={book}
                    cartQuantity={getCartQuantity(book.id)}
                    isFavorite={isFavorite(book.id)}
                    onToggleFavorite={favoriteBook => toggleFavorite(favoriteBook.id)}
                    onAddToCart={addToCart}
                  />
                </li>
              ))}
            </ul>
          )}

          {!isLoading && hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isLoadingMore ? 'Cargando más libros…' : 'Cargar más'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
