import { Firestore } from 'firebase-admin/firestore';

import { COLLECTIONS, USER_SUBCOLLECTIONS } from '../../src/constants/firestore.js';
import { paginateReaderText, rescalePage } from '../../src/lib/readerPagination.js';

export class ReaderError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const legacyPageCount = (text: string) =>
  Math.ceil(
    text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean).length / 2,
  );

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
    const previousTotal = Number(library.get('totalPages'));
    const fromTotal = previousTotal === legacyPageCount(text) ? previousTotal : totalPages;
    const lastReadPage = Number.isInteger(savedPage)
      ? Math.max(0, Math.min(rescalePage(savedPage, fromTotal, totalPages), totalPages))
      : 0;
    if (previousTotal !== totalPages || savedPage !== lastReadPage) {
      const bookmarks = (library.get('bookmarks') ?? []) as { page: number }[];
      transaction.update(libraryRef, {
        totalPages,
        lastReadPage,
        bookmarks: bookmarks.map(bookmark => ({
          ...bookmark,
          page: Math.max(1, rescalePage(bookmark.page, fromTotal, totalPages)),
        })),
      });
    }
    return { totalPages, lastReadPage };
  });
}
