import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentData,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from 'firebase/firestore';

import { CATALOG_PAGE_SIZE } from '@/constants/catalog';
import { useBooks } from '@/features/catalog/BooksProvider';
import { CatalogFilters, CatalogQueryPlan, planCatalogQuery } from '@/features/catalog/catalogFilters';
import { firestoreRefs } from '@/services/firestore';
import { Book } from '@/types';

const MAX_ROUNDS_PER_PAGE = 5;

const LOAD_ERROR = 'No pudimos cargar el catálogo. Revisá tu conexión e intentá de nuevo.';

function buildConstraints(plan: CatalogQueryPlan): QueryConstraint[] {
  return [
    ...plan.equals.map(([field, value]) => where(field, '==', value)),
    ...(plan.searchToken ? [where('searchTokens', 'array-contains', plan.searchToken)] : []),
    ...(plan.priceRange?.min != null ? [where('price', '>=', plan.priceRange.min)] : []),
    ...(plan.priceRange?.max != null ? [where('price', '<=', plan.priceRange.max)] : []),
    orderBy(plan.orderBy.field, plan.orderBy.direction),
  ];
}

export function useCatalogBooks(filters: CatalogFilters) {
  const { rememberBooks } = useBooks();
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<QueryDocumentSnapshot<Book, DocumentData> | null>(null);
  const requestRef = useRef(0);

  const filtersKey = JSON.stringify(filters);
  const plan = useMemo(() => planCatalogQuery(JSON.parse(filtersKey)), [filtersKey]);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      const request = ++requestRef.current;
      const baseQuery = query(firestoreRefs.books(), ...buildConstraints(plan));
      let cursor = reset ? null : cursorRef.current;
      let exhausted = false;
      const collected: Book[] = [];

      try {
        for (
          let round = 0;
          round < MAX_ROUNDS_PER_PAGE && collected.length < CATALOG_PAGE_SIZE && !exhausted;
          round++
        ) {
          const snapshot = await getDocs(
            query(baseQuery, ...(cursor ? [startAfter(cursor)] : []), limit(CATALOG_PAGE_SIZE)),
          );
          if (request !== requestRef.current) return;
          collected.push(...snapshot.docs.map(bookDoc => bookDoc.data()).filter(plan.clientFilter));
          cursor = snapshot.docs.at(-1) ?? cursor;
          exhausted = snapshot.docs.length < CATALOG_PAGE_SIZE;
        }
        cursorRef.current = cursor;
        rememberBooks(collected);
        setBooks(previous => (reset ? collected : [...previous, ...collected]));
        setHasMore(!exhausted);
        setError(null);
      } catch (caught) {
        if (request !== requestRef.current) return;
        console.error('Catalog query failed', caught);
        setError(LOAD_ERROR);
        setHasMore(false);
      }
    },
    [plan, rememberBooks],
  );

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setBooks([]);
    setTotal(null);
    fetchPage(true).finally(() => {
      if (isActive) setIsLoading(false);
    });
    if (plan.isExact) {
      getCountFromServer(query(firestoreRefs.books(), ...buildConstraints(plan)))
        .then(snapshot => isActive && setTotal(snapshot.data().count))
        .catch(() => undefined);
    }
    return () => {
      isActive = false;
    };
  }, [fetchPage, plan]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchPage(false);
    setIsLoadingMore(false);
  }, [fetchPage, hasMore, isLoading, isLoadingMore]);

  return { books, total, isLoading, isLoadingMore, hasMore, error, loadMore };
}

export function useCatalogPriceCeiling() {
  const [priceCeiling, setPriceCeiling] = useState(0);

  useEffect(() => {
    getDocs(query(firestoreRefs.books(), where('status', '==', 'published'), orderBy('price', 'desc'), limit(1)))
      .then(snapshot => setPriceCeiling(Math.ceil(snapshot.docs[0]?.data().price ?? 0)))
      .catch(() => undefined);
  }, []);

  return priceCeiling;
}
