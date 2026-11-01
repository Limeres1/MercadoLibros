import { MemoryRouter } from 'react-router';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_BOOKS, INITIAL_USERS } from '@/data/initialData';
import { BookRecommendations } from '@/features/catalog/BookRecommendations';
import { ApiError } from '@/services/api';

const fake = vi.hoisted(() => ({
  currentUser: null as unknown,
  postApi: vi.fn(),
  requireLogin: vi.fn(),
}));

vi.mock('@/features/auth/SessionProvider', () => ({ useSession: () => ({ currentUser: fake.currentUser }) }));
vi.mock('@/features/auth/useRequireLogin', () => ({ useRequireLogin: () => fake.requireLogin }));
vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooksByIds: (ids: string[]) => ({
    books: INITIAL_BOOKS.filter(book => ids.includes(book.id)),
    isLoading: false,
  }),
}));
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return { ...actual, postApi: fake.postApi };
});

const renderPanel = () =>
  render(
    <MemoryRouter>
      <BookRecommendations />
    </MemoryRouter>,
  );

describe('BookRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.currentUser = INITIAL_USERS[2];
    fake.requireLogin.mockReturnValue(INITIAL_USERS[2]);
  });

  it('asks a visitor to log in instead of calling the AI', async () => {
    fake.currentUser = null;
    fake.requireLogin.mockReturnValue(null);
    renderPanel();
    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), { target: { value: 'misterio' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /ingresá para pedir/i })));
    expect(fake.requireLogin).toHaveBeenCalled();
    expect(fake.postApi).not.toHaveBeenCalled();
  });

  it('shows the recommended books with the reason and a link to each book', async () => {
    fake.postApi.mockResolvedValue({
      recommendations: [{ bookId: 'book_1', reason: 'Una saga familiar inolvidable' }],
    });
    renderPanel();
    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), { target: { value: 'una saga familiar' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Recomendarme' })));
    expect(screen.getByText('Una saga familiar inolvidable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cien años de soledad/i })).toHaveAttribute('href', '/libro/book_1');
  });

  it('CA-2: shows the error message and keeps the catalog usable', async () => {
    fake.postApi.mockRejectedValue(new ApiError('El asistente no está disponible en este momento.'));
    renderPanel();
    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), { target: { value: 'misterio' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Recomendarme' })));
    expect(screen.getByRole('alert')).toHaveTextContent('El asistente no está disponible en este momento.');
    expect(screen.getByRole('alert')).toHaveTextContent('podés seguir explorando el catálogo');
  });

  it('tells the reader when nothing fits', async () => {
    fake.postApi.mockResolvedValue({ recommendations: [] });
    renderPanel();
    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), { target: { value: 'algo imposible' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Recomendarme' })));
    expect(screen.getByText(/no encontramos libros que encajen/i)).toBeInTheDocument();
  });
});
