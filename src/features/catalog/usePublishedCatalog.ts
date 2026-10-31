import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';

import { useBooks } from '@/features/catalog/BooksProvider';
import { getErrorMessage } from '@/lib/errors';
import { firestoreRefs } from '@/services/firestore';
import { Book } from '@/types';

const CATALOG_ERROR = 'No pudimos cargar los libros para las recomendaciones.';

export function usePublishedCatalog() {
  const { rememberBooks } = useBooks();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    return onSnapshot(
      query(firestoreRefs.books(), where('status', '==', 'published')),
      snapshot => {
        const publishedBooks = snapshot.docs
          .map(bookDoc => bookDoc.data())
          .filter(book => book.status === 'published')
          .sort((first, second) => first.title.localeCompare(second.title));
        rememberBooks(publishedBooks);
        setBooks(publishedBooks);
        setIsLoading(false);
      },
      caught => {
        console.error('Published catalog request for recommendations failed', caught);
        setBooks([]);
        setError(`${CATALOG_ERROR} ${getErrorMessage(caught)}`);
        setIsLoading(false);
      },
    );
  }, [rememberBooks]);

  return { books, isLoading, error };
}
