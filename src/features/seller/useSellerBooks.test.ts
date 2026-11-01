import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSellerBooks } from '@/features/seller/useSellerBooks';
import { Book } from '@/types';

const mockToast = vi.fn();
const mockAddBook = vi.fn().mockResolvedValue(true);
const mockUpdateBook = vi.fn().mockResolvedValue(true);
const mockSaveBookContent = vi.fn().mockResolvedValue(true);
const mockLoadBookContent = vi.fn().mockResolvedValue('Texto guardado');

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
    loadBookContent: mockLoadBookContent,
  }),
}));

describe('useSellerBooks - CA-2 (Editar un libro publicado lo vuelve a revisión)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddBook.mockResolvedValue(true);
    mockUpdateBook.mockResolvedValue(true);
    mockSaveBookContent.mockResolvedValue(true);
    mockLoadBookContent.mockResolvedValue('Texto guardado');
  });

  it('CA-2: editing a published book forces status to pending_review even if submitForReview is false', async () => {
    const { saveBook } = useSellerBooks();

    await saveBook(
      {
        id: 'book_pub_1',
        title: 'Título Modificado',
        price: 25,
      },
      false,
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

  it('creates a new digital book as a draft, stores its text and then sends it to review', async () => {
    const { saveBook } = useSellerBooks();
    const calls: string[] = [];
    mockAddBook.mockImplementation(async () => calls.push('add') > 0);
    mockSaveBookContent.mockImplementation(async () => calls.push('content') > 0);
    mockUpdateBook.mockImplementation(async () => calls.push('review') > 0);

    expect(await saveBook({ title: 'Nuevo', author: 'Autora', condition: 'digital' }, true, 'Texto completo')).toBe(
      true,
    );

    expect(calls).toEqual(['add', 'content', 'review']);
    expect(mockAddBook.mock.calls[0][0]).toMatchObject({ status: 'draft', sellerId: 'seller_123' });
    expect(mockAddBook.mock.calls[0][0]).not.toHaveProperty('stock');
    expect(mockUpdateBook).toHaveBeenCalledWith(expect.any(String), { status: 'pending_review' });
  });

  it('keeps a stock of 0 for physical books', async () => {
    const { saveBook } = useSellerBooks();
    await saveBook({ title: 'Agotado', author: 'Autor', condition: 'usado', stock: 0 }, false);
    expect(mockAddBook.mock.calls[0][0].stock).toBe(0);
  });

  it('reports failure so the form stays open when Firestore rejects the change', async () => {
    const { saveBook } = useSellerBooks();
    mockUpdateBook.mockResolvedValue(false);
    expect(await saveBook({ id: 'book_draft_1', title: 'X' }, true)).toBe(false);
    expect(mockToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('does not send a digital draft to review while it has no text for buyers', async () => {
    const { saveBook } = useSellerBooks();
    mockLoadBookContent.mockResolvedValue(null);
    expect(await saveBook({ ...draftBook, condition: 'digital' }, true)).toBe(false);
    expect(mockUpdateBook).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Subí el archivo del libro'), 'error');
  });
});
