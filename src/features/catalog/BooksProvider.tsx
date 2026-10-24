import React, { useCallback } from 'react';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_BOOK_CONTENTS, INITIAL_BOOKS } from '@/data/initialData';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { Book, BookContent } from '@/types';

interface BooksContextValue {
  books: Book[];
  getBook: (id: string) => Book | undefined;
  addBook: (book: Book) => void;
  updateBook: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void;
  getBookContent: (bookId: string) => BookContent | undefined;
  saveBookContent: (bookId: string, text: string) => void;
}

const [Provider, useBooks] = createSafeContext<BooksContextValue>('useBooks');
export { useBooks };

export const BooksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = usePersistentState<Book[]>(STORAGE_KEYS.books, INITIAL_BOOKS);

  const [contents, setContents] = usePersistentState<BookContent[]>(STORAGE_KEYS.bookContents, INITIAL_BOOK_CONTENTS);

  const getBookContent = useCallback(
    (bookId: string) => contents.find(content => content.bookId === bookId),
    [contents],
  );

  const saveBookContent = useCallback(
    (bookId: string, text: string) =>
      setContents(prev => [
        ...prev.filter(content => content.bookId !== bookId),
        { bookId, text, updatedAt: new Date().toISOString() },
      ]),
    [setContents],
  );

  const getBook = useCallback((id: string) => books.find(book => book.id === id), [books]);

  const addBook = useCallback((book: Book) => setBooks(prev => [book, ...prev]), [setBooks]);

  const updateBook = useCallback<BooksContextValue['updateBook']>(
    (id, patch) =>
      setBooks(prev =>
        prev.map(book =>
          book.id === id
            ? { ...book, ...(typeof patch === 'function' ? patch(book) : patch), updatedAt: new Date().toISOString() }
            : book,
        ),
      ),
    [setBooks],
  );

  return (
    <Provider value={{ books, getBook, addBook, updateBook, getBookContent, saveBookContent }}>{children}</Provider>
  );
};
