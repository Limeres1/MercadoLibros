import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { createId } from '@/lib/ids';
import { Book, BookStatus } from '@/types';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80';

function nextStatus(current: BookStatus, submitForReview: boolean): BookStatus {
  if (current === 'published' || submitForReview) return 'pending_review';
  return current === 'rejected' ? 'draft' : current;
}

export function useSellerBooks() {
  const { currentUser } = useSession();
  const { managedBooks: books, addBook, updateBook, saveBookContent, loadBookContent } = useBooks();
  const { showToast } = useToast();

  const sellerBooks = currentUser ? books.filter(book => book.sellerId === currentUser.id) : [];

  const saveBook = async (bookData: Partial<Book>, submitForReview: boolean, contentText?: string) => {
    if (!currentUser) return false;
    const existing = bookData.id ? books.find(book => book.id === bookData.id) : undefined;
    const isDigital = (bookData.condition ?? existing?.condition) === 'digital';

    if (existing) {
      if (isDigital && submitForReview && !contentText && !(await loadBookContent(existing.id))) {
        showToast('Subí el archivo del libro antes de enviarlo a revisión: es lo que leen los compradores.', 'error');
        return false;
      }
      if (isDigital && contentText && !(await saveBookContent(existing.id, contentText))) return false;
      if (!(await updateBook(existing.id, { ...bookData, status: nextStatus(existing.status, submitForReview) })))
        return false;
      showToast(
        existing.status === 'published'
          ? 'Libro modificado. Vuelve a revisión del administrador antes de republicarse.'
          : submitForReview
            ? 'Libro enviado a revisión del administrador.'
            : 'Borrador actualizado.',
        'success',
      );
      return true;
    }

    const now = new Date().toISOString();
    const id = createId();
    const condition = bookData.condition || 'nuevo';
    const created = await addBook({
      id,
      title: bookData.title || 'Título sin definir',
      author: bookData.author || 'Autor desconocido',
      isbn: bookData.isbn || '',
      description: bookData.description || '',
      price: Number(bookData.price) || 10,
      condition,
      genre: bookData.genre || 'Ficción',
      language: bookData.language || 'Español',
      coverUrl: bookData.coverUrl || DEFAULT_COVER,
      sampleText: bookData.sampleText || '',
      sellerId: currentUser.id,
      sellerName: currentUser.displayName,
      status: 'draft',
      rating: 0,
      reviewCount: 0,
      salesCount: 0,
      pages: Math.round(Number(bookData.pages)) || 200,
      publicationYear: Math.round(Number(bookData.publicationYear)) || new Date().getFullYear(),
      ...(condition === 'digital' ? {} : { stock: Math.max(0, Math.round(Number(bookData.stock)) || 0) }),
      createdAt: now,
      updatedAt: now,
    });
    if (!created) return false;
    if (condition === 'digital' && contentText && !(await saveBookContent(id, contentText))) {
      showToast(
        'Guardamos la ficha como borrador, pero no el texto del libro. Editalo y volvé a subir el archivo.',
        'error',
      );
      return false;
    }
    if (submitForReview && !(await updateBook(id, { status: 'pending_review' }))) return false;
    showToast(submitForReview ? 'Libro enviado a revisión del administrador.' : 'Guardado como borrador.', 'success');
    return true;
  };

  const withdrawBook = async (bookId: string) => {
    if (!(await updateBook(bookId, { status: 'withdrawn' }))) return;
    showToast(
      'El libro ha sido retirado de la venta. Los compradores previos conservan su acceso en biblioteca.',
      'info',
    );
  };

  return { sellerBooks, saveBook, withdrawBook };
}
