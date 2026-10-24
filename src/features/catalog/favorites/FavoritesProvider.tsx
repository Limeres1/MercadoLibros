import React from 'react';

import { useToast } from '@/components/ui/Toast';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';

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
  const [byUser, setByUser] = usePersistentState<Record<string, string[]>>(STORAGE_KEYS.favorites, {});

  const favorites = currentUser ? (byUser[currentUser.id] ?? []) : [];

  const isFavorite = (bookId: string) => favorites.includes(bookId);

  const toggleFavorite = (bookId: string) => {
    const user = requireLogin('Inicia sesión para guardar libros en tus favoritos.');
    if (!user) return;
    const exists = favorites.includes(bookId);
    setByUser(prev => ({
      ...prev,
      [user.id]: exists ? favorites.filter(id => id !== bookId) : [...favorites, bookId],
    }));
    showToast(
      exists ? 'Libro removido de favoritos.' : '¡Libro agregado a tus favoritos!',
      exists ? 'info' : 'success',
    );
  };

  return <Provider value={{ favorites, isFavorite, toggleFavorite }}>{children}</Provider>;
};
