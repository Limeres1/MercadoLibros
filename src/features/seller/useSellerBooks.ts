import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { createId } from '@/lib/ids';
import { Book } from '@/types';

export function useSellerBooks() {
  const { currentUser } = useSession();
  const { books, addBook, updateBook, saveBookContent } = useBooks();
  const { showToast } = useToast();

  const sellerBooks = currentUser ? books.filter(book => book.sellerId === currentUser.id) : [];

  const saveBook = async (bookData: Partial<Book>, submitForReview: boolean, contentText?: string) => {
    if (!currentUser) return;
    const existing = bookData.id ? books.find(book => book.id === bookData.id) : undefined;

    if (existing) {
      updateBook(existing.id, { ...bookData, status: submitForReview ? 'pending_review' : existing.status });
      if (bookData.condition === 'digital' && contentText !== undefined) saveBookContent(existing.id, contentText);
      showToast(submitForReview ? 'Libro enviado a revisión del administrador.' : 'Borrador actualizado.', 'success');
      return;
    }

    const now = new Date().toISOString();
    const id = createId();
    const condition = bookData.condition || 'nuevo';
    addBook({
      id,
      title: bookData.title || 'Título sin definir',
      author: bookData.author || 'Autor desconocido',
      isbn: bookData.isbn || '',
      description: bookData.description || '',
      price: Number(bookData.price) || 10,
      condition,
      genre: bookData.genre || 'Ficción',
      language: bookData.language || 'Español',
      coverUrl:
        bookData.coverUrl ||
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
      sampleText: bookData.sampleText || 'Fragmento no disponible.',
      sellerId: currentUser.id,
      sellerName: currentUser.displayName,
      status: submitForReview ? 'pending_review' : 'draft',
      rating: 0,
      reviewCount: 0,
      salesCount: 0,
      pages: Number(bookData.pages) || 200,
      publicationYear: Number(bookData.publicationYear) || new Date().getFullYear(),
      stock: condition === 'digital' ? undefined : Number(bookData.stock) || 1,
      createdAt: now,
      updatedAt: now,
    });
    if (condition === 'digital') saveBookContent(id, contentText || '');
    showToast(
      submitForReview ? '¡Libro enviado para revisión del Administrador!' : 'Guardado como borrador.',
      'success',
    );
  };

  const withdrawBook = async (bookId: string) => {
    updateBook(bookId, { status: 'withdrawn' });
    showToast(
      'El libro ha sido retirado de la venta. Los compradores previos conservan su acceso en biblioteca.',
      'info',
    );
  };

  return { sellerBooks, saveBook, withdrawBook };
}
