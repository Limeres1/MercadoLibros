import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_LIBRARY } from '@/data/initialData';
import { LibraryPage } from '@/features/reader/LibraryPage';

const fake = vi.hoisted(() => ({ page: 2 }));
vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => ({ currentUser: { id: 'owner' } }) }));
vi.mock('@/features/catalog/BooksProvider', () => ({ useBooksByIds: () => ({ books: [] }) }));
vi.mock('@/features/reader/LibraryProvider', () => ({
  useLibrary: () => ({ items: [{ ...INITIAL_LIBRARY[0], lastReadPage: fake.page, totalPages: 3 }] }),
}));

describe('library reading progress', () => {
  it('shows 67% on page two and 100% on the last page of a three-page book', () => {
    fake.page = 2;
    const view = render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/67%/)).toHaveTextContent('Pág. 2 de 3');
    fake.page = 3;
    view.rerender(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/100%/)).toHaveTextContent('Pág. 3 de 3');
  });
});
