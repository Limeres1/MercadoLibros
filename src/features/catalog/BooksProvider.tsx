import React, { useCallback } from 'react';
import { Book } from '../../types';
import { INITIAL_BOOKS } from '../../data/initialData';
import { createSafeContext } from '../../lib/createSafeContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { STORAGE_KEYS } from '../../constants/storageKeys';

interface BooksContextValue {
  books: Book[];
  getBook: (id: string) => Book | undefined;
  addBook: (book: Book) => void;
  updateBook: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void;
}

const [Provider, useBooks] = createSafeContext<BooksContextValue>('useBooks');
export { useBooks };

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = usePersistentState<Book[]>(STORAGE_KEYS.books, INITIAL_BOOKS);

  const getBook = useCallback((id: string) => books.find(b => b.id === id), [books]);

  const addBook = useCallback((book: Book) => setBooks(prev => [book, ...prev]), [setBooks]);

  const updateBook = useCallback<BooksContextValue['updateBook']>(
    (id, patch) =>
      setBooks(prev =>
        prev.map(b =>
          b.id === id ? { ...b, ...(typeof patch === 'function' ? patch(b) : patch), updatedAt: new Date().toISOString() } : b
        )
      ),
    [setBooks]
  );

  return <Provider value={{ books, getBook, addBook, updateBook }}>{children}</Provider>;
};
