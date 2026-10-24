import React from 'react';
import { createSafeContext } from '../../../lib/createSafeContext';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { useToast } from '../../../components/ui/Toast';
import { useRequireLogin } from '../../auth/useRequireLogin';
import { useSession } from '../../auth/SessionProvider';
import { STORAGE_KEYS } from '../../../constants/storageKeys';

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

  const favorites = currentUser ? byUser[currentUser.id] ?? [] : [];

  const isFavorite = (bookId: string) => favorites.includes(bookId);

  const toggleFavorite = (bookId: string) => {
    const user = requireLogin('Inicia sesión para guardar libros en tus favoritos.');
    if (!user) return;
    const exists = favorites.includes(bookId);
    setByUser(prev => ({
      ...prev,
      [user.id]: exists ? favorites.filter(id => id !== bookId) : [...favorites, bookId],
    }));
    showToast(exists ? 'Libro removido de favoritos.' : '¡Libro agregado a tus favoritos!', exists ? 'info' : 'success');
  };

  return <Provider value={{ favorites, isFavorite, toggleFavorite }}>{children}</Provider>;
};
