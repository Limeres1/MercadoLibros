import { Firestore } from 'firebase-admin/firestore';

import { COLLECTIONS, USER_SUBCOLLECTIONS } from '../../src/constants/firestore.js';
import { paginateReaderText } from '../../src/lib/readerPagination.js';

export class ReaderError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function synchronizeReaderPages(db: Firestore, userId: string, bookId: string) {
  const libraryRef = db.collection(COLLECTIONS.users).doc(userId).collection(USER_SUBCOLLECTIONS.library).doc(bookId);
  const contentRef = db.collection(COLLECTIONS.bookContents).doc(bookId);
  return db.runTransaction(async transaction => {
    const library = await transaction.get(libraryRef);
    if (!library.exists) throw new ReaderError('Este libro no está en tu biblioteca.', 403);
    const content = await transaction.get(contentRef);
    const text = content.get('text');
    const totalPages = typeof text === 'string' ? paginateReaderText(text).length : 0;
    if (!totalPages) throw new ReaderError('No pudimos cargar el texto completo.', 409);
    const savedPage = library.get('lastReadPage');
    const lastReadPage = Number.isInteger(savedPage) ? Math.max(0, Math.min(savedPage, totalPages)) : 0;
    if (library.get('totalPages') !== totalPages || savedPage !== lastReadPage) {
      transaction.update(libraryRef, { totalPages, lastReadPage });
    }
    return { totalPages, lastReadPage };
  });
}
