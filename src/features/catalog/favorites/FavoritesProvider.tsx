import React, { useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { firestoreRefs } from '@/services/firestore';
import { FavoriteEntry } from '@/types';

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (bookId: string) => boolean;
  toggleFavorite: (bookId: string) => void;
}

const [Provider, useFavorites] = createSafeContext<FavoritesContextValue>('useFavorites');
export { useFavorites };

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [entries, setEntries] = useState<FavoriteEntry[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const userId = currentUser?.id;

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    setEntries([]);
    setLoadedUserId(userId ?? null);
    if (!userId) return;
    return onSnapshot(
      firestoreRefs.favorites(userId),
      snapshot => setEntries(snapshot.docs.map(favoriteDoc => favoriteDoc.data())),
      error => showToastRef.current(getErrorMessage(error), 'error'),
    );
  }, [userId]);

  const favorites = loadedUserId === userId ? entries.map(entry => entry.bookId) : [];
  const isFavorite = (bookId: string) => favorites.includes(bookId);

  const toggleFavorite = (bookId: string) => {
    const user = requireLogin('Inicia sesión para guardar libros en tus favoritos.');
    if (!user) return;
    const favoriteRef = doc(firestoreRefs.favorites(user.id), bookId);
    const exists = favorites.includes(bookId);
    const showcase = currentUser?.favoriteBookIds ?? [];
    const write = exists
      ? deleteDoc(favoriteRef).then(() =>
          showcase.includes(bookId)
            ? updateDoc(firestoreRefs.user(user.id), { favoriteBookIds: showcase.filter(id => id !== bookId) })
            : undefined,
        )
      : setDoc(favoriteRef, { bookId, createdAt: new Date().toISOString() });
    void write
      .then(() =>
        showToastRef.current(
          exists ? 'Libro removido de favoritos.' : '¡Libro agregado a tus favoritos!',
          exists ? 'info' : 'success',
        ),
      )
      .catch(error => showToastRef.current(getErrorMessage(error), 'error'));
  };

  return <Provider value={{ favorites, isFavorite, toggleFavorite }}>{children}</Provider>;
};
