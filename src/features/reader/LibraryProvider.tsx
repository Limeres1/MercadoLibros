import React, { useEffect, useRef, useState } from 'react';
import { arrayRemove, arrayUnion, doc, FieldValue, onSnapshot, updateDoc } from 'firebase/firestore';

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
  addBookmark: (bookId: string, page: number, title: string, note?: string) => Promise<boolean>;
  deleteBookmark: (bookId: string, bookmarkId: string) => Promise<boolean>;
}

const [Provider, useLibrary] = createSafeContext<LibraryContextValue>('useLibrary');
export { useLibrary };

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [library, setLibrary] = useState<{ userId: string; items: LibraryItem[]; isLoading: boolean } | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const userId = currentUser?.id;
  const items = library?.userId === userId ? (library?.items ?? []) : [];
  const isLoading = Boolean(userId && (library?.userId !== userId || library?.isLoading));

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    if (!userId) {
      setLibrary(null);
      return;
    }
    let isActive = true;
    setLibrary({ userId, items: [], isLoading: true });
    const unsubscribe = onSnapshot(
      firestoreRefs.library(userId),
      snapshot => {
        if (!isActive) return;
        setLibrary({
          userId,
          items: snapshot.docs
            .map(itemDoc => itemDoc.data())
            .sort((first, second) => second.purchasedAt.localeCompare(first.purchasedAt)),
          isLoading: false,
        });
      },
      error => {
        if (!isActive) return;
        showToastRef.current(getErrorMessage(error), 'error');
        setLibrary({ userId, items: [], isLoading: false });
      },
    );
    return () => {
      isActive = false;
      unsubscribe();
    };
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

  const saveItem = (bookId: string, changes: { lastReadPage?: number; bookmarks?: FieldValue }) => {
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
    if (!item || !Number.isInteger(page) || page < 1) return;
    if (page > item.totalPages) {
      showToast('No pudimos guardar esta página: la cantidad de páginas del libro no coincide con el lector.', 'error');
      return;
    }
    saveItem(bookId, { lastReadPage: page });
  };

  const addBookmark = async (bookId: string, page: number, title: string, note?: string) => {
    const item = getItem(bookId);
    if (!item || !Number.isInteger(page) || page < 1 || page > item.totalPages) return false;
    if (item.bookmarks.length >= 100) {
      showToast('Podés guardar hasta 100 marcadores por libro. Eliminá uno para agregar otro.', 'info');
      return false;
    }
    const bookmark: Bookmark = {
      id: createId(),
      page,
      title: title.trim() || `Marcador en página ${page}`,
      ...(note?.trim() ? { note: note.trim() } : {}),
      createdAt: new Date().toISOString(),
    };
    const saved = await saveItem(bookId, { bookmarks: arrayUnion(bookmark) });
    if (saved) {
      showToast(`Marcador guardado en la página ${page}.`, 'success');
    }
    return saved;
  };

  const deleteBookmark = async (bookId: string, bookmarkId: string) => {
    const item = getItem(bookId);
    const bookmark = item?.bookmarks.find(candidate => candidate.id === bookmarkId);
    if (!bookmark) return false;
    const deleted = await saveItem(bookId, { bookmarks: arrayRemove(bookmark) });
    if (deleted) {
      showToast('Marcador eliminado.', 'info');
    }
    return deleted;
  };

  return (
    <Provider
      value={{ items, isLoading, getItem, hasBook, hasPurchased, updateReadingProgress, addBookmark, deleteBookmark }}
    >
      {children}
    </Provider>
  );
};
