import React from 'react';

import { useToast } from '@/components/ui/Toast';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_LIBRARY } from '@/data/initialData';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { createId } from '@/lib/ids';
import { Book, Bookmark, LibraryItem } from '@/types';

interface LibraryContextValue {
  items: LibraryItem[];
  getItem: (bookId: string) => LibraryItem | undefined;
  hasBook: (bookId: string) => boolean;
  addPurchasedBooks: (books: Book[], orderId: string) => void;
  updateReadingProgress: (bookId: string, page: number) => void;
  addBookmark: (bookId: string, page: number, title: string, note?: string) => void;
  deleteBookmark: (bookId: string, bookmarkId: string) => void;
}

const [Provider, useLibrary] = createSafeContext<LibraryContextValue>('useLibrary');
export { useLibrary };

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [allItems, setAllItems] = usePersistentState<LibraryItem[]>(STORAGE_KEYS.library, INITIAL_LIBRARY);

  const items = currentUser ? allItems.filter(item => item.userId === currentUser.id) : [];
  const getItem = (bookId: string) => items.find(item => item.bookId === bookId);
  const hasBook = (bookId: string) => items.some(item => item.bookId === bookId);

  const updateOwnItem = (bookId: string, update: (item: LibraryItem) => LibraryItem) => {
    if (!currentUser) return;
    setAllItems(prev =>
      prev.map(item => (item.userId === currentUser.id && item.bookId === bookId ? update(item) : item)),
    );
  };

  const addPurchasedBooks = (books: Book[], orderId: string) => {
    if (!currentUser) return;
    setAllItems(prev => {
      const owned = new Set(prev.filter(item => item.userId === currentUser.id).map(item => item.bookId));
      const newItems: LibraryItem[] = books
        .filter(book => !owned.has(book.id))
        .map(book => ({
          id: book.id,
          userId: currentUser.id,
          bookId: book.id,
          orderId,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          purchasedAt: new Date().toISOString(),
          lastReadPage: 1,
          totalPages: Math.max(book.pages || 10, 10),
          bookmarks: [],
        }));
      return [...newItems, ...prev];
    });
  };

  const updateReadingProgress = (bookId: string, page: number) =>
    updateOwnItem(bookId, item => ({ ...item, lastReadPage: page }));

  const addBookmark = (bookId: string, page: number, title: string, note?: string) => {
    const bookmark: Bookmark = {
      id: createId(),
      page,
      title: title || `Marcador en página ${page}`,
      note,
      createdAt: new Date().toISOString(),
    };
    updateOwnItem(bookId, item => ({ ...item, bookmarks: [...item.bookmarks, bookmark] }));
    showToast(`Marcador guardado en la página ${page}`, 'success');
  };

  const deleteBookmark = (bookId: string, bookmarkId: string) => {
    updateOwnItem(bookId, item => ({
      ...item,
      bookmarks: item.bookmarks.filter(bookmark => bookmark.id !== bookmarkId),
    }));
    showToast('Marcador eliminado.', 'info');
  };

  return (
    <Provider
      value={{ items, getItem, hasBook, addPurchasedBooks, updateReadingProgress, addBookmark, deleteBookmark }}
    >
      {children}
    </Provider>
  );
};
