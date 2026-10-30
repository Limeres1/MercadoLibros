import { describe, expect, it, vi } from 'vitest';

import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { Book } from '@/types';

const mockToast = vi.fn();
const mockAddBook = vi.fn().mockResolvedValue(true);
const mockUpdateBook = vi.fn().mockResolvedValue(true);
const mockSaveBookContent = vi.fn().mockResolvedValue(true);

const sellerUser = {
  id: 'seller_123',
  displayName: 'Vendedor Test',
  role: 'seller' as const,
  email: 'vendedor@test.com',
  createdAt: '2024-01-01',
};

const publishedBook: Book = {
  id: 'book_pub_1',
  title: 'Libro Publicado',
  author: 'Autor',
  isbn: '123',
  description: 'Desc',
  price: 20,
  condition: 'nuevo',
  genre: 'Ficción',
  language: 'Español',
  coverUrl: 'https://example.com/cover.jpg',
  sampleText: 'Sample',
  sellerId: 'seller_123',
  sellerName: 'Vendedor Test',
  status: 'published',
  rating: 5,
  reviewCount: 1,
  salesCount: 3,
  pages: 100,
  publicationYear: 2023,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const draftBook: Book = {
  ...publishedBook,
  id: 'book_draft_1',
  title: 'Libro Borrador',
  status: 'draft',
};

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockToast }),
}));

vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ currentUser: sellerUser }),
}));

vi.mock('@/features/catalog/BooksProvider', () => ({
  useBooks: () => ({
    managedBooks: [publishedBook, draftBook],
    addBook: mockAddBook,
    updateBook: mockUpdateBook,
    saveBookContent: mockSaveBookContent,
  }),
}));

describe('useSellerBooks - CA-2 (Editar un libro publicado lo vuelve a revisión)', () => {
  it('CA-2: editing a published book forces status to pending_review even if submitForReview is false', async () => {
    const { saveBook } = useSellerBooks();

    await saveBook(
      {
        id: 'book_pub_1',
        title: 'Título Modificado',
        price: 25,
      },
      false, // even with submitForReview = false!
    );

    expect(mockUpdateBook).toHaveBeenCalledWith('book_pub_1', {
      id: 'book_pub_1',
      title: 'Título Modificado',
      price: 25,
      status: 'pending_review',
    });
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Vuelve a revisión'), 'success');
  });

  it('keeps draft status when saving a draft without submitting for review', async () => {
    const { saveBook } = useSellerBooks();

    await saveBook(
      {
        id: 'book_draft_1',
        title: 'Borrador Actualizado',
      },
      false,
    );

    expect(mockUpdateBook).toHaveBeenCalledWith('book_draft_1', {
      id: 'book_draft_1',
      title: 'Borrador Actualizado',
      status: 'draft',
    });
    expect(mockToast).toHaveBeenCalledWith('Borrador actualizado.', 'success');
  });

  it('transitions draft to pending_review when submitForReview is true', async () => {
    const { saveBook } = useSellerBooks();

    await saveBook(
      {
        id: 'book_draft_1',
        title: 'Borrador Listo',
      },
      true,
    );

    expect(mockUpdateBook).toHaveBeenCalledWith('book_draft_1', {
      id: 'book_draft_1',
      title: 'Borrador Listo',
      status: 'pending_review',
    });
    expect(mockToast).toHaveBeenCalledWith('Libro enviado a revisión del administrador.', 'success');
  });
});
