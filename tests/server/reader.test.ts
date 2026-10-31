import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { ReaderError, synchronizeReaderPages } from '@api/_lib/reader';

const app = initializeApp({ projectId: 'demo-mercadolibros' }, 'reader-test');
const db = getFirestore(app);
const libraryRef = db.doc('users/reader-owner/library/reader-book');
const contentRef = db.doc('bookContents/reader-book');
const bookmark = { id: 'scene', page: 2, title: 'Escena', createdAt: '2026-10-31T00:00:00Z' };

afterAll(() => deleteApp(app));
beforeEach(async () => {
  await libraryRef.set({
    userId: 'reader-owner',
    bookId: 'reader-book',
    totalPages: 200,
    lastReadPage: 2,
    orderId: 'paid-order',
    bookmarks: [bookmark],
    title: 'Libro adquirido',
  });
  await contentRef.set({ text: 'Uno.\n\nDos.\n\nTres.\n\nCuatro.\n\nCinco.' });
});

describe('trusted reader pagination', () => {
  it('repairs old page counts while preserving reading position, bookmarks and purchase data', async () => {
    expect(await synchronizeReaderPages(db, 'reader-owner', 'reader-book')).toEqual({ totalPages: 3, lastReadPage: 2 });
    const saved = (await libraryRef.get()).data();
    expect(saved).toMatchObject({ totalPages: 3, lastReadPage: 2, bookmarks: [bookmark], orderId: 'paid-order' });
    await synchronizeReaderPages(db, 'reader-owner', 'reader-book');
    expect((await libraryRef.get()).data()).toEqual(saved);
  });

  it('does not need a published catalog entry to repair a purchased withdrawn book', async () => {
    await db.doc('books/reader-book').set({ status: 'withdrawn' });
    await expect(synchronizeReaderPages(db, 'reader-owner', 'reader-book')).resolves.toHaveProperty('totalPages', 3);
  });

  it('rejects nonowners without creating a library entry or reading the content for them', async () => {
    await expect(synchronizeReaderPages(db, 'reader-other', 'reader-book')).rejects.toMatchObject({ status: 403 });
    expect((await db.doc('users/reader-other/library/reader-book').get()).exists).toBe(false);
    expect((await libraryRef.get()).get('totalPages')).toBe(200);
  });

  it('keeps old metadata if full text is unavailable and bounds positions when text exists', async () => {
    await contentRef.delete();
    await expect(synchronizeReaderPages(db, 'reader-owner', 'reader-book')).rejects.toBeInstanceOf(ReaderError);
    expect((await libraryRef.get()).get('totalPages')).toBe(200);
    await contentRef.set({ text: 'Una página.' });
    await expect(synchronizeReaderPages(db, 'reader-owner', 'reader-book')).resolves.toEqual({
      totalPages: 1,
      lastReadPage: 1,
    });
    await libraryRef.update({ lastReadPage: 0 });
    await expect(synchronizeReaderPages(db, 'reader-owner', 'reader-book')).resolves.toHaveProperty('lastReadPage', 0);
  });
});
