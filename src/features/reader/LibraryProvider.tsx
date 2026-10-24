import React from 'react';
import { Book, Bookmark, LibraryItem } from '../../types';
import { INITIAL_LIBRARY } from '../../data/initialData';
import { createSafeContext } from '../../lib/createSafeContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useToast } from '../../components/ui/Toast';
import { useSession } from '../auth/SessionProvider';
import { STORAGE_KEYS } from '../../constants/storageKeys';

interface LibraryContextValue {
  items: LibraryItem[];
  getItem: (bookId: string) => LibraryItem | undefined;
  hasBook: (bookId: string) => boolean;
  addPurchasedBooks: (books: Book[]) => void;
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

  const items = currentUser ? allItems.filter(l => l.userId === currentUser.id) : [];
  const getItem = (bookId: string) => items.find(l => l.bookId === bookId);
  const hasBook = (bookId: string) => items.some(l => l.bookId === bookId);

  const updateOwnItem = (bookId: string, update: (item: LibraryItem) => LibraryItem) => {
    if (!currentUser) return;
    setAllItems(prev => prev.map(l => (l.userId === currentUser.id && l.bookId === bookId ? update(l) : l)));
  };

  const addPurchasedBooks = (books: Book[]) => {
    if (!currentUser) return;
    setAllItems(prev => {
      const owned = new Set(prev.filter(l => l.userId === currentUser.id).map(l => l.bookId));
      const newItems: LibraryItem[] = books
        .filter(b => !owned.has(b.id))
        .map(b => ({
          id: `lib_${Date.now()}_${b.id}`,
          userId: currentUser.id,
          bookId: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          purchasedAt: new Date().toISOString(),
          lastReadPage: 1,
          totalPages: Math.max(b.pages || 10, 10),
          bookmarks: [],
        }));
      return [...newItems, ...prev];
    });
  };

  const updateReadingProgress = (bookId: string, page: number) =>
    updateOwnItem(bookId, item => ({ ...item, lastReadPage: page }));

  const addBookmark = (bookId: string, page: number, title: string, note?: string) => {
    const bookmark: Bookmark = {
      id: 'bm_' + Date.now(),
      page,
      title: title || `Marcador en página ${page}`,
      note,
      createdAt: new Date().toISOString(),
    };
    updateOwnItem(bookId, item => ({ ...item, bookmarks: [...item.bookmarks, bookmark] }));
    showToast(`Marcador guardado en la página ${page}`, 'success');
  };

  const deleteBookmark = (bookId: string, bookmarkId: string) => {
    updateOwnItem(bookId, item => ({ ...item, bookmarks: item.bookmarks.filter(b => b.id !== bookmarkId) }));
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
