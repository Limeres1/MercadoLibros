import { MemoryRouter } from 'react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookRecommendations } from '@/features/catalog/BookRecommendations';
import { Book } from '@/types';

const mocks = vi.hoisted(() => ({ ask: vi.fn(), resetError: vi.fn(), error: null as string | null }));
vi.mock('@/hooks/useAI', () => ({
  useAI: () => ({ ask: mocks.ask, isLoading: false, error: mocks.error, resetError: mocks.resetError }),
}));

const book = (id: string, status: Book['status']): Book =>
  ({
    id,
    title: `Libro ${id}`,
    author: 'Autora',
    isbn: '',
    description: 'Descripción',
    price: 10,
    condition: 'digital',
    genre: 'Ficción',
    language: 'Español',
    coverUrl: '',
    sampleText: '',
    sellerId: 'seller',
    sellerName: 'Librería',
    status,
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 100,
    publicationYear: 2020,
    createdAt: '',
    updatedAt: '',
  }) as Book;

const renderPanel = (books: Book[]) =>
  render(
    <MemoryRouter>
      <BookRecommendations books={books} isCatalogLoading={false} catalogError={null} />
    </MemoryRouter>,
  );

describe('BookRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.error = null;
  });

  it('links only validated published recommendations to their book pages', async () => {
    mocks.ask.mockResolvedValue(
      JSON.stringify({
        recommendations: [
          { bookId: 'published-1', reason: 'Una aventura breve y atrapante.' },
          { bookId: 'unpublished', reason: 'No debe mostrarse.' },
        ],
      }),
    );
    renderPanel([book('published-1', 'published'), book('unpublished', 'draft')]);

    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), {
      target: { value: 'Una aventura breve' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recomendarme' }));

    expect(await screen.findByText('Libro published-1')).toBeInTheDocument();
    expect(screen.getByText('Una aventura breve y atrapante.')).toBeInTheDocument();
    expect(screen.queryByText('Libro unpublished')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Libro published-1/ })).toHaveAttribute('href', '/libro/published-1');
  });

  it('shows AI errors without hiding the catalog panel', async () => {
    mocks.error = 'La IA no está disponible en este momento.';
    mocks.ask.mockResolvedValue(null);
    renderPanel([book('published-1', 'published')]);

    fireEvent.change(screen.getByLabelText('Qué te gustaría leer'), { target: { value: 'Misterio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recomendarme' }));

    await waitFor(() => expect(mocks.ask).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: '¿Qué querés leer?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recomendarme' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('La IA no está disponible en este momento.');
  });
});
