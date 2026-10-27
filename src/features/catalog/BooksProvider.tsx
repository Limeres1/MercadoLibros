import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteField,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  QueryConstraint,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { buildSearchTokens } from '@/lib/searchTokens';
import { firestoreRefs } from '@/services/firestore';
import { Book } from '@/types';

const IN_QUERY_LIMIT = 30;

interface BooksContextValue {
  managedBooks: Book[];
  isLoading: boolean;
  getBook: (id: string) => Book | undefined;
  rememberBooks: (books: Book[]) => void;
  loadBooks: (ids: string[]) => Promise<void>;
  watchBooks: (ids: string[]) => () => void;
  addBook: (book: Book) => Promise<boolean>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<boolean>;
  loadBookContent: (bookId: string) => Promise<string | null>;
  saveBookContent: (bookId: string, text: string) => Promise<boolean>;
}

const [Provider, useBooks] = createSafeContext<BooksContextValue>('useBooks');
export { useBooks };

const toFirestorePatch = (patch: Partial<Book>) =>
  Object.fromEntries(
    Object.entries(patch)
      .filter(([field]) => field !== 'id')
      .map(([field, value]) => [field, value === undefined ? deleteField() : value]),
  );

const chunk = (ids: string[]) =>
  Array.from({ length: Math.ceil(ids.length / IN_QUERY_LIMIT) }, (_slot, index) =>
    ids.slice(index * IN_QUERY_LIMIT, (index + 1) * IN_QUERY_LIMIT),
  );

const publishedByIds = (ids: string[]): QueryConstraint[] => [
  where('status', '==', 'published'),
  where(documentId(), 'in', ids),
];

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [cache, setCache] = useState<Record<string, Book>>({});
  const cacheRef = useRef(cache);
  const [managedBooks, setManagedBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const isSeller = currentUser?.role === 'seller';

  useEffect(() => {
    showToastRef.current = showToast;
    cacheRef.current = cache;
  });

  const rememberBooks = useCallback((books: Book[]) => {
    if (books.length === 0) return;
    setCache(previous => ({ ...previous, ...Object.fromEntries(books.map(book => [book.id, book])) }));
  }, []);

  useEffect(() => {
    if (!userId || (!isAdmin && !isSeller)) {
      setManagedBooks([]);
      return;
    }
    const booksRef = firestoreRefs.books();
    setIsLoading(true);
    return onSnapshot(
      isAdmin ? booksRef : query(booksRef, where('sellerId', '==', userId)),
      snapshot => {
        const books = snapshot.docs.map(bookDoc => bookDoc.data());
        setManagedBooks(books);
        rememberBooks(books);
        setIsLoading(false);
      },
      error => {
        showToastRef.current(getErrorMessage(error), 'error');
        setIsLoading(false);
      },
    );
  }, [userId, isAdmin, isSeller, rememberBooks]);

  const getBook = useCallback((id: string) => cache[id], [cache]);

  const loadBooks = useCallback(
    async (ids: string[]) => {
      const missing = [...new Set(ids)].filter(id => !cacheRef.current[id]);
      if (missing.length === 0) return;
      const snapshots = await Promise.all(
        chunk(missing).map(group => getDocs(query(firestoreRefs.books(), ...publishedByIds(group)))),
      ).catch(() => []);
      rememberBooks(snapshots.flatMap(snapshot => snapshot.docs.map(bookDoc => bookDoc.data())));
    },
    [rememberBooks],
  );

  const watchBooks = useCallback(
    (ids: string[]) => {
      const unsubscribers = chunk([...new Set(ids)]).map(group =>
        onSnapshot(
          query(firestoreRefs.books(), ...publishedByIds(group)),
          snapshot => rememberBooks(snapshot.docs.map(bookDoc => bookDoc.data())),
          () => undefined,
        ),
      );
      return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    },
    [rememberBooks],
  );

  const addBook = useCallback(async ({ status, ...book }: Book) => {
    try {
      const bookRef = firestoreRefs.book(book.id);
      await setDoc(bookRef, { ...book, searchTokens: buildSearchTokens(book), status: 'draft' });
      if (status !== 'draft') await updateDoc(bookRef, { status, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      showToastRef.current(getErrorMessage(error), 'error');
      return false;
    }
  }, []);

  const updateBook = useCallback(async (id: string, patch: Partial<Book>) => {
    const current = cacheRef.current[id];
    const touchesSearch = 'title' in patch || 'author' in patch || 'isbn' in patch;
    const searchTokens = touchesSearch && current ? buildSearchTokens({ ...current, ...patch }) : undefined;
    try {
      await updateDoc(
        firestoreRefs.book(id),
        toFirestorePatch({
          ...patch,
          ...(searchTokens ? { searchTokens } : {}),
          updatedAt: new Date().toISOString(),
        }),
      );
      return true;
    } catch (error) {
      showToastRef.current(getErrorMessage(error), 'error');
      return false;
    }
  }, []);

  const loadBookContent = useCallback(
    (bookId: string) =>
      getDoc(firestoreRefs.bookContent(bookId))
        .then(snapshot => (snapshot.exists() ? snapshot.data().text : null))
        .catch(() => null),
    [],
  );

  const saveBookContent = useCallback(async (bookId: string, text: string) => {
    if (!text.trim()) return true;
    try {
      await setDoc(firestoreRefs.bookContent(bookId), { bookId, text, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      showToastRef.current(getErrorMessage(error), 'error');
      return false;
    }
  }, []);

  return (
    <Provider
      value={{
        managedBooks,
        isLoading,
        getBook,
        rememberBooks,
        loadBooks,
        watchBooks,
        addBook,
        updateBook,
        loadBookContent,
        saveBookContent,
      }}
    >
      {children}
    </Provider>
  );
};

export function useBook(bookId: string | undefined) {
  const { getBook, rememberBooks } = useBooks();
  const [isLoading, setIsLoading] = useState(Boolean(bookId));

  useEffect(() => {
    if (!bookId) return;
    setIsLoading(true);
    return onSnapshot(
      firestoreRefs.book(bookId),
      snapshot => {
        if (snapshot.exists()) rememberBooks([snapshot.data()]);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [bookId, rememberBooks]);

  return { book: bookId ? getBook(bookId) : undefined, isLoading };
}

export function useBooksByIds(ids: string[]) {
  const { getBook, loadBooks } = useBooks();
  const idsKey = [...new Set(ids)].sort().join('|');
  const [isLoading, setIsLoading] = useState(ids.length > 0);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    loadBooks(idsKey ? idsKey.split('|') : []).finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, [idsKey, loadBooks]);

  const books = useMemo(() => ids.map(id => getBook(id)).filter((book): book is Book => Boolean(book)), [ids, getBook]);
  return { books, isLoading };
}

export function useBookContent(bookId: string) {
  const { loadBookContent } = useBooks();
  const [content, setContent] = useState<{ bookId: string; text: string | null } | null>(null);

  useEffect(() => {
    let isActive = true;
    loadBookContent(bookId).then(text => isActive && setContent({ bookId, text }));
    return () => {
      isActive = false;
    };
  }, [bookId, loadBookContent]);

  const isCurrent = content?.bookId === bookId;
  return { text: isCurrent ? content.text : null, isLoading: !isCurrent };
}
