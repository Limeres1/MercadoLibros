import { MemoryRouter } from 'react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_USERS } from '@/data/initialData';
import { ProfilePage } from '@/features/auth/ProfilePage';

const updateFavoriteBookIds = vi.fn();

vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({
    currentUser: { ...INITIAL_USERS[2], favoriteBookIds: ['book_withdrawn'] },
    updateUserProfile: vi.fn(),
    updateFavoriteBookIds,
  }),
}));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooksByIds: () => ({ books: [], isLoading: false }) }));
vi.mock('@/features/catalog/favorites/FavoritesProvider', () => ({ useFavorites: () => ({ favorites: [] }) }));

describe('ProfilePage showcase', () => {
  it('shows an unavailable book in its slot and lets the user free it', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Libro no disponible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /quitar este libro de la vitrina/i }));
    expect(updateFavoriteBookIds).toHaveBeenCalledWith([]);
  });
});
