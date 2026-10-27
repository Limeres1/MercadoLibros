import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { createId } from '@/lib/ids';
import { firestoreRefs } from '@/services/firestore';
import { Bookmark, LibraryItem } from '@/types';

interface LibraryContextValue {
  items: LibraryItem[];
  isLoading: boolean;
  getItem: (bookId: string) => LibraryItem | undefined;
  hasBook: (bookId: string) => boolean;
  hasPurchased: (bookId: string) => boolean;
  updateReadingProgress: (bookId: string, page: number) => void;
  addBookmark: (bookId: string, page: number, title: string, note?: string) => void;
  deleteBookmark: (bookId: string, bookmarkId: string) => void;
}

const [Provider, useLibrary] = createSafeContext<LibraryContextValue>('useLibrary');
export { useLibrary };

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const userId = currentUser?.id;

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    setItems([]);
    if (!userId) return;
    setIsLoading(true);
    return onSnapshot(
      firestoreRefs.library(userId),
      snapshot => {
        setItems(
          snapshot.docs
            .map(itemDoc => itemDoc.data())
            .sort((first, second) => second.purchasedAt.localeCompare(first.purchasedAt)),
        );
        setIsLoading(false);
      },
      error => {
        showToastRef.current(getErrorMessage(error), 'error');
        setIsLoading(false);
      },
    );
  }, [userId]);

  useEffect(() => {
    setPurchasedIds(new Set());
    if (!userId) return;
    return onSnapshot(
      firestoreRefs.purchases(userId),
      snapshot => setPurchasedIds(new Set(snapshot.docs.map(purchase => purchase.id))),
      () => undefined,
    );
  }, [userId]);

  const getItem = (bookId: string) => items.find(item => item.bookId === bookId);
  const hasBook = (bookId: string) => items.some(item => item.bookId === bookId);
  const hasPurchased = (bookId: string) => purchasedIds.has(bookId) || hasBook(bookId);

  const saveItem = (bookId: string, changes: Pick<Partial<LibraryItem>, 'lastReadPage' | 'bookmarks'>) => {
    if (!userId) return Promise.resolve(false);
    return updateDoc(doc(firestoreRefs.library(userId), bookId), changes)
      .then(() => true)
      .catch(error => {
        showToast(getErrorMessage(error), 'error');
        return false;
      });
  };

  const updateReadingProgress = (bookId: string, page: number) => {
    const item = getItem(bookId);
    if (item && item.lastReadPage !== page) saveItem(bookId, { lastReadPage: Math.min(page, item.totalPages) });
  };

  const addBookmark = async (bookId: string, page: number, title: string, note?: string) => {
    const item = getItem(bookId);
    if (!item) return;
    const bookmark: Bookmark = {
      id: createId(),
      page,
      title: title || `Marcador en página ${page}`,
      ...(note ? { note } : {}),
      createdAt: new Date().toISOString(),
    };
    if (await saveItem(bookId, { bookmarks: [...item.bookmarks, bookmark] })) {
      showToast(`Marcador guardado en la página ${page}.`, 'success');
    }
  };

  const deleteBookmark = async (bookId: string, bookmarkId: string) => {
    const item = getItem(bookId);
    if (!item) return;
    if (await saveItem(bookId, { bookmarks: item.bookmarks.filter(bookmark => bookmark.id !== bookmarkId) })) {
      showToast('Marcador eliminado.', 'info');
    }
  };

  return (
    <Provider
      value={{ items, isLoading, getItem, hasBook, hasPurchased, updateReadingProgress, addBookmark, deleteBookmark }}
    >
      {children}
    </Provider>
  );
};
