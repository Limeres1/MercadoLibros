import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FavoritesProvider, useFavorites } from '@/features/catalog/favorites/FavoritesProvider';

const fake = vi.hoisted(() => ({
  user: { id: 'buyer-1', favoriteBookIds: ['book-1', 'book-2'] },
  listener: (() => undefined) as (snapshot: unknown) => void,
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => ({ currentUser: fake.user }) }));
vi.mock('@/features/auth/useRequireLogin', () => ({ useRequireLogin: () => () => fake.user }));
vi.mock('@/services/firestore', () => ({
  firestoreRefs: { favorites: () => 'favorites', user: (uid: string) => ({ user: uid }) },
}));
vi.mock('firebase/firestore', () => ({
  doc: (_ref: unknown, id: string) => ({ id }),
  onSnapshot: (_ref: unknown, listener: (snapshot: unknown) => void) => {
    fake.listener = listener;
    return () => undefined;
  },
  deleteDoc: fake.deleteDoc,
  setDoc: fake.setDoc,
  updateDoc: fake.updateDoc,
}));

let favorites: ReturnType<typeof useFavorites>;
const Probe: React.FC = () => {
  favorites = useFavorites();
  return null;
};

describe('FavoritesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.deleteDoc.mockResolvedValue(undefined);
    fake.updateDoc.mockResolvedValue(undefined);
  });

  it('removes the book from the profile showcase when it stops being a favorite', async () => {
    render(
      <FavoritesProvider>
        <Probe />
      </FavoritesProvider>,
    );
    act(() => fake.listener({ docs: [{ data: () => ({ bookId: 'book-1', createdAt: 'x' }) }] }));
    await act(async () => favorites.toggleFavorite('book-1'));
    expect(fake.deleteDoc).toHaveBeenCalled();
    expect(fake.updateDoc).toHaveBeenCalledWith({ user: 'buyer-1' }, { favoriteBookIds: ['book-2'] });
  });
});
