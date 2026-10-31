import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_LIBRARY } from '@/data/initialData';
import { LibraryProvider, useLibrary } from '@/features/reader/LibraryProvider';
import { LibraryItem } from '@/types';

interface LibrarySnapshot {
  docs: { id: string; data: () => LibraryItem }[];
}

const fake = vi.hoisted(() => ({
  session: { currentUser: { id: 'owner' } as { id: string } | null },
  listeners: new Map<string, (snapshot: LibrarySnapshot) => void>(),
  updateDoc: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => fake.session }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/services/firestore', () => ({
  firestoreRefs: {
    library: (uid: string) => `users/${uid}/library`,
    purchases: (uid: string) => `users/${uid}/purchases`,
  },
}));
vi.mock('firebase/firestore', () => ({
  arrayUnion: (bookmark: unknown) => ({ operation: 'union', bookmark }),
  arrayRemove: (bookmark: unknown) => ({ operation: 'remove', bookmark }),
  doc: (collection: string, bookId: string) => `${collection}/${bookId}`,
  updateDoc: (...args: unknown[]) => fake.updateDoc(...args),
  onSnapshot: (path: string, listener: (snapshot: LibrarySnapshot) => void) => {
    fake.listeners.set(path, listener);
    return () => fake.listeners.delete(path);
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <LibraryProvider>{children}</LibraryProvider>;
const item: LibraryItem = { ...INITIAL_LIBRARY[0], bookId: 'book', userId: 'owner', lastReadPage: 1, totalPages: 3 };
const emit = (uid: string, items: LibraryItem[]) => {
  act(() =>
    fake.listeners.get(`users/${uid}/library`)?.({ docs: items.map(data => ({ id: data.bookId, data: () => data })) }),
  );
};

beforeEach(() => {
  fake.session.currentUser = { id: 'owner' };
  fake.listeners.clear();
  fake.updateDoc.mockReset().mockResolvedValue(undefined);
  fake.showToast.mockClear();
});

describe('bookmarks in Firestore', () => {
  it('adds a trimmed bookmark atomically without replacing the array or reading position', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [{ ...item, bookmarks: [] }]);
    await act(async () => {
      expect(await result.current.addBookmark('book', 2, '  Escena  ', '  Mi nota  ')).toBe(true);
    });
    expect(fake.updateDoc).toHaveBeenCalledWith('users/owner/library/book', {
      bookmarks: {
        operation: 'union',
        bookmark: expect.objectContaining({ page: 2, title: 'Escena', note: 'Mi nota' }),
      },
    });
  });

  it('uses a default title and omits an empty note', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [{ ...item, bookmarks: [] }]);
    await act(async () => result.current.addBookmark('book', 1, ' ', ' '));
    const saved = fake.updateDoc.mock.calls[0][1].bookmarks.bookmark;
    expect(saved.title).toBe('Marcador en página 1');
    expect(saved).not.toHaveProperty('note');
  });

  it('removes just the selected bookmark atomically', async () => {
    const bookmark = { id: 'saved', page: 2, title: 'Escena', createdAt: '2026-10-31T00:00:00Z' };
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [{ ...item, bookmarks: [bookmark] }]);
    await act(async () => {
      expect(await result.current.deleteBookmark('book', 'saved')).toBe(true);
      expect(await result.current.deleteBookmark('book', 'missing')).toBe(false);
    });
    expect(fake.updateDoc).toHaveBeenCalledTimes(1);
    expect(fake.updateDoc).toHaveBeenCalledWith('users/owner/library/book', {
      bookmarks: { operation: 'remove', bookmark },
    });
  });

  it('reports a failed creation without a success notification', async () => {
    fake.updateDoc.mockRejectedValue({ code: 'unavailable' });
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [{ ...item, bookmarks: [] }]);
    await act(async () => expect(await result.current.addBookmark('book', 2, 'Escena')).toBe(false));
    expect(fake.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
    expect(fake.showToast).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('rejects invalid pages, unowned books and a full bookmark list', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [{ ...item, bookmarks: [] }]);
    await act(async () => {
      for (const page of [0, -1, 1.5, NaN, 4]) {
        expect(await result.current.addBookmark('book', page, 'Escena')).toBe(false);
      }
      expect(await result.current.addBookmark('missing', 1, 'Escena')).toBe(false);
    });
    const bookmark = { id: 'saved', page: 1, title: 'Escena', createdAt: '2026-10-31T00:00:00Z' };
    emit('owner', [
      { ...item, bookmarks: Array.from({ length: 100 }, (_slot, index) => ({ ...bookmark, id: String(index) })) },
    ]);
    await act(async () => expect(await result.current.addBookmark('book', 1, 'Más')).toBe(false));
    expect(fake.updateDoc).not.toHaveBeenCalled();
  });
});

describe('reading progress in Firestore', () => {
  it('saves every navigation intent, including a rapid return before a snapshot arrives', () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    emit('owner', [item]);
    expect(result.current.isLoading).toBe(false);
    act(() => {
      result.current.updateReadingProgress('book', 2);
      result.current.updateReadingProgress('book', 1);
    });
    expect(fake.updateDoc.mock.calls).toEqual([
      ['users/owner/library/book', { lastReadPage: 2 }],
      ['users/owner/library/book', { lastReadPage: 1 }],
    ]);
  });

  it.each([NaN, Infinity, -1, 0, 1.5, 4])('does not write an invalid page (%s) or silently change it', page => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [item]);
    act(() => result.current.updateReadingProgress('book', page));
    expect(fake.updateDoc).not.toHaveBeenCalled();
    if (page > item.totalPages && Number.isFinite(page)) {
      expect(fake.showToast).toHaveBeenCalledWith(expect.stringContaining('cantidad de páginas'), 'error');
    }
  });

  it('restores the server position after logout and login, ignoring a late old subscription', () => {
    const { result, rerender } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [item]);
    const oldListener = fake.listeners.get('users/owner/library')!;
    fake.session.currentUser = null;
    rerender();
    act(() => oldListener({ docs: [{ id: 'book', data: () => item }] }));
    expect(result.current.items).toEqual([]);
    act(() => result.current.updateReadingProgress('book', 2));
    expect(fake.updateDoc).not.toHaveBeenCalled();
    fake.session.currentUser = { id: 'owner' };
    rerender();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    emit('owner', [{ ...item, lastReadPage: 3 }]);
    expect(result.current.getItem('book')?.lastReadPage).toBe(3);
  });

  it('never saves another account’s library progress after switching accounts', () => {
    const { result, rerender } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [item]);
    fake.session.currentUser = { id: 'other' };
    rerender();
    act(() => result.current.updateReadingProgress('book', 2));
    expect(result.current.items).toEqual([]);
    expect(fake.updateDoc).not.toHaveBeenCalled();
    emit('other', [{ ...item, userId: 'other' }]);
    act(() => result.current.updateReadingProgress('book', 3));
    expect(fake.updateDoc).toHaveBeenCalledWith('users/other/library/book', { lastReadPage: 3 });
  });

  it('reports a rejected save without falsely changing the stored position', async () => {
    fake.updateDoc.mockRejectedValue({ code: 'unavailable' });
    const { result } = renderHook(() => useLibrary(), { wrapper });
    emit('owner', [item]);
    await act(async () => result.current.updateReadingProgress('book', 2));
    expect(fake.showToast).toHaveBeenCalledWith(expect.stringContaining('no está disponible'), 'error');
    expect(result.current.getItem('book')?.lastReadPage).toBe(1);
  });
});
