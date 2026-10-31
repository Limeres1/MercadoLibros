import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { COLLECTIONS, docIds, USER_SUBCOLLECTIONS } from '@/constants/firestore';

const BUYER = 'buyer_1';
const OTHER_BUYER = 'buyer_2';
const SELLER = 'seller_1';
const ADMIN = 'admin_1';
const BLOCKED = 'blocked_1';
const BOOK = 'book_1';
const DRAFT_BOOK = 'book_draft';
const NOW = '2026-10-27T12:00:00.000Z';

let testEnv: RulesTestEnvironment;

const profile = (role: string, isBlocked = false) => ({
  email: `${role}@test.com`,
  displayName: role,
  role,
  isBlocked,
  favoriteBookIds: [],
  createdAt: NOW,
});

const book = (overrides: Record<string, unknown> = {}) => ({
  title: 'Ficciones',
  author: 'Jorge Luis Borges',
  isbn: '978-0307950925',
  description: 'Cuentos',
  price: 12.5,
  condition: 'digital',
  genre: 'Cuentos',
  language: 'Español',
  coverUrl: '',
  sampleText: 'Muestra',
  sellerId: SELLER,
  sellerName: 'Librería',
  status: 'draft',
  rating: 0,
  reviewCount: 0,
  salesCount: 0,
  pages: 200,
  publicationYear: 1944,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const order = (overrides: Record<string, unknown> = {}) => ({
  buyerId: BUYER,
  buyerName: 'Comprador',
  buyerEmail: 'buyer@test.com',
  items: [{ bookId: BOOK, sellerId: SELLER, title: 'Ficciones', price: 10, quantity: 1 }],
  sellerIds: [SELLER],
  subtotal: 10,
  shippingCost: 4.5,
  totalAmount: 14.5,
  paymentMethod: 'mercadopago',
  status: 'pending',
  createdAt: NOW,
  ...overrides,
});

const dbAs = (uid: string) => testEnv.authenticatedContext(uid, { email: `${uid}@test.com` }).firestore();
const libraryDoc = (uid: string, bookId: string) =>
  doc(dbAs(uid), COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.library, bookId);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-mercadolibros',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(() => testEnv.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, COLLECTIONS.users, BUYER), profile('buyer'));
    await setDoc(doc(db, COLLECTIONS.users, OTHER_BUYER), profile('buyer'));
    await setDoc(doc(db, COLLECTIONS.users, SELLER), profile('seller'));
    await setDoc(doc(db, COLLECTIONS.users, ADMIN), profile('admin'));
    await setDoc(doc(db, COLLECTIONS.users, BLOCKED), profile('buyer', true));
    await setDoc(doc(db, COLLECTIONS.books, BOOK), book({ status: 'published' }));
    await setDoc(doc(db, COLLECTIONS.books, DRAFT_BOOK), book());
    await setDoc(doc(db, COLLECTIONS.bookContents, BOOK), { text: 'Texto completo', updatedAt: NOW });
    await setDoc(doc(db, COLLECTIONS.users, BUYER, USER_SUBCOLLECTIONS.library, BOOK), {
      userId: BUYER,
      bookId: BOOK,
      orderId: 'order_1',
      title: 'Ficciones',
      author: 'Borges',
      coverUrl: '',
      purchasedAt: NOW,
      lastReadPage: 0,
      totalPages: 200,
      bookmarks: [],
    });
    await setDoc(doc(db, COLLECTIONS.users, BUYER, USER_SUBCOLLECTIONS.favorites, BOOK), { createdAt: NOW });
    await setDoc(doc(db, COLLECTIONS.orders, 'order_1'), order());
  });
});

describe('users', () => {
  it('CA-1: a buyer cannot make themselves admin or unblock themselves', async () => {
    await assertFails(updateDoc(doc(dbAs(BUYER), COLLECTIONS.users, BUYER), { role: 'admin' }));
    await assertFails(updateDoc(doc(dbAs(BLOCKED), COLLECTIONS.users, BLOCKED), { isBlocked: false }));
    await assertSucceeds(updateDoc(doc(dbAs(BUYER), COLLECTIONS.users, BUYER), { displayName: 'Nuevo nombre' }));
  });

  it('only allows signing up as buyer or seller, without a password field', async () => {
    const newUser = 'new_user';
    const ref = doc(dbAs(newUser), COLLECTIONS.users, newUser);
    const signup = { ...profile('buyer'), email: `${newUser}@test.com` };
    await assertFails(setDoc(ref, { ...signup, role: 'admin' }));
    await assertFails(setDoc(ref, { ...signup, password: 'secreta' }));
    await assertFails(setDoc(doc(dbAs(newUser), COLLECTIONS.users, BUYER), signup));
    await assertSucceeds(setDoc(ref, signup));
  });

  it('lets an admin block a user', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(ADMIN), COLLECTIONS.users, BUYER), { isBlocked: true }));
  });
});

describe('books', () => {
  it('CA-2: a seller cannot create a published book', async () => {
    const db = dbAs(SELLER);
    await assertFails(setDoc(doc(db, COLLECTIONS.books, 'book_new'), book({ status: 'published' })));
    await assertSucceeds(setDoc(doc(db, COLLECTIONS.books, 'book_new'), book()));
  });

  it('only sellers create books, for themselves', async () => {
    await assertFails(setDoc(doc(dbAs(BUYER), COLLECTIONS.books, 'book_new'), book({ sellerId: BUYER })));
    await assertFails(setDoc(doc(dbAs(SELLER), COLLECTIONS.books, 'book_new'), book({ sellerId: 'seller_2' })));
  });

  it('only the admin publishes', async () => {
    await assertFails(updateDoc(doc(dbAs(SELLER), COLLECTIONS.books, DRAFT_BOOK), { status: 'published' }));
    await assertSucceeds(updateDoc(doc(dbAs(SELLER), COLLECTIONS.books, DRAFT_BOOK), { status: 'pending_review' }));
    await assertSucceeds(updateDoc(doc(dbAs(ADMIN), COLLECTIONS.books, DRAFT_BOOK), { status: 'published' }));
  });

  it('hides drafts from other users', async () => {
    await assertFails(getDoc(doc(dbAs(BUYER), COLLECTIONS.books, DRAFT_BOOK)));
    await assertSucceeds(getDoc(doc(dbAs(SELLER), COLLECTIONS.books, DRAFT_BOOK)));
    await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), COLLECTIONS.books, BOOK)));
  });

  it('a seller cannot change sales or rating', async () => {
    await assertFails(updateDoc(doc(dbAs(SELLER), COLLECTIONS.books, BOOK), { salesCount: 999 }));
  });

  it('blocked sellers cannot publish books', async () => {
    await testEnv.withSecurityRulesDisabled(context =>
      updateDoc(doc(context.firestore(), COLLECTIONS.users, SELLER), { isBlocked: true }),
    );
    await assertFails(setDoc(doc(dbAs(SELLER), COLLECTIONS.books, 'book_new'), book()));
  });
});

describe('book contents', () => {
  it('C3 CA-3: a purchased book stays readable after withdrawal, only for its owner', async () => {
    await assertSucceeds(updateDoc(doc(dbAs(SELLER), COLLECTIONS.books, BOOK), { status: 'withdrawn' }));
    await assertSucceeds(getDoc(doc(dbAs(BUYER), COLLECTIONS.books, BOOK)));
    await assertSucceeds(getDoc(doc(dbAs(BUYER), COLLECTIONS.bookContents, BOOK)));
    await assertFails(getDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.books, BOOK)));
    await assertFails(getDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.bookContents, BOOK)));
    const visitor = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(visitor, COLLECTIONS.books, BOOK)));
    await assertFails(getDoc(doc(visitor, COLLECTIONS.bookContents, BOOK)));
  });

  it('only the owner of the book in the library, the seller or the admin read the full text', async () => {
    await assertSucceeds(getDoc(doc(dbAs(BUYER), COLLECTIONS.bookContents, BOOK)));
    await assertSucceeds(getDoc(doc(dbAs(SELLER), COLLECTIONS.bookContents, BOOK)));
    await assertSucceeds(getDoc(doc(dbAs(ADMIN), COLLECTIONS.bookContents, BOOK)));
    await assertFails(getDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.bookContents, BOOK)));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), COLLECTIONS.bookContents, BOOK)));
  });
});

describe('favorites and library', () => {
  it('C3: concurrent bookmark changes preserve additions from another browser', async () => {
    const first = { id: 'first', page: 1, title: 'Primero', createdAt: NOW };
    const second = { id: 'second', page: 2, title: 'Segundo', createdAt: NOW };
    const third = { id: 'third', page: 3, title: 'Tercero', note: 'Nota', createdAt: NOW };
    const firstBrowser = libraryDoc(BUYER, BOOK);
    const secondBrowser = libraryDoc(BUYER, BOOK);
    await Promise.all([
      assertSucceeds(updateDoc(firstBrowser, { bookmarks: arrayUnion(first) })),
      assertSucceeds(updateDoc(secondBrowser, { bookmarks: arrayUnion(second) })),
    ]);
    expect((await getDoc(firstBrowser)).data()?.bookmarks).toEqual(expect.arrayContaining([first, second]));
    await Promise.all([
      assertSucceeds(updateDoc(firstBrowser, { bookmarks: arrayRemove(first) })),
      assertSucceeds(updateDoc(secondBrowser, { bookmarks: arrayUnion(third) })),
    ]);
    const restored = (await getDoc(libraryDoc(BUYER, BOOK))).data();
    expect(restored?.bookmarks).toHaveLength(2);
    expect(restored?.bookmarks).toEqual(expect.arrayContaining([second, third]));
    expect(restored?.lastReadPage).toBe(0);
    await assertFails(updateDoc(libraryDoc(OTHER_BUYER, BOOK), { bookmarks: arrayUnion(first) }));
  });

  it('CA-3: a user cannot read favorites or library of another user', async () => {
    const db = dbAs(OTHER_BUYER);
    await assertFails(getDoc(doc(db, COLLECTIONS.users, BUYER, USER_SUBCOLLECTIONS.favorites, BOOK)));
    await assertFails(getDoc(doc(db, COLLECTIONS.users, BUYER, USER_SUBCOLLECTIONS.library, BOOK)));
    await assertSucceeds(getDoc(libraryDoc(BUYER, BOOK)));
  });

  it('the owner saves reading progress but cannot add books to the library', async () => {
    await assertSucceeds(updateDoc(libraryDoc(BUYER, BOOK), { lastReadPage: 12 }));
    await assertFails(updateDoc(libraryDoc(BUYER, BOOK), { orderId: 'otro' }));
    await assertFails(
      setDoc(libraryDoc(BUYER, DRAFT_BOOK), { userId: BUYER, bookId: DRAFT_BOOK, lastReadPage: 0, totalPages: 1 }),
    );
  });

  it('cart quantity must be between 1 and 10', async () => {
    const ref = doc(dbAs(BUYER), COLLECTIONS.users, BUYER, USER_SUBCOLLECTIONS.cart, BOOK);
    await assertFails(setDoc(ref, { quantity: 0, addedAt: NOW }));
    await assertSucceeds(setDoc(ref, { quantity: 2, addedAt: NOW }));
  });
});

describe('orders', () => {
  it('a buyer creates pending orders only, with a consistent total', async () => {
    const db = dbAs(BUYER);
    await assertSucceeds(setDoc(doc(db, COLLECTIONS.orders, 'order_new'), order()));
    await assertFails(setDoc(doc(db, COLLECTIONS.orders, 'order_paid'), order({ status: 'paid' })));
    await assertFails(setDoc(doc(db, COLLECTIONS.orders, 'order_cheap'), order({ totalAmount: 1 })));
    await assertFails(setDoc(doc(db, COLLECTIONS.orders, 'order_other'), order({ buyerId: OTHER_BUYER })));
  });

  it('the buyer cannot mark an order as paid', async () => {
    await assertFails(updateDoc(doc(dbAs(BUYER), COLLECTIONS.orders, 'order_1'), { status: 'paid' }));
  });

  it('buyer and seller read the order, other users do not', async () => {
    await assertSucceeds(getDoc(doc(dbAs(BUYER), COLLECTIONS.orders, 'order_1')));
    await assertSucceeds(getDoc(doc(dbAs(SELLER), COLLECTIONS.orders, 'order_1')));
    await assertFails(getDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.orders, 'order_1')));
  });
});

describe('reviews', () => {
  const review = (userId: string) => ({
    bookId: BOOK,
    userId,
    userName: 'Lector',
    rating: 5,
    comment: 'Excelente',
    createdAt: NOW,
  });

  it('CA-1: buyers of a physical book can review it thanks to the purchase record', async () => {
    const physicalReview = { ...review(OTHER_BUYER), bookId: DRAFT_BOOK };
    const reviewRef = doc(dbAs(OTHER_BUYER), COLLECTIONS.reviews, docIds.review(DRAFT_BOOK, OTHER_BUYER));
    await assertFails(setDoc(reviewRef, physicalReview));
    await testEnv.withSecurityRulesDisabled(context =>
      setDoc(doc(context.firestore(), COLLECTIONS.users, OTHER_BUYER, USER_SUBCOLLECTIONS.purchases, DRAFT_BOOK), {
        orderId: 'order_2',
        purchasedAt: NOW,
      }),
    );
    await assertSucceeds(setDoc(reviewRef, physicalReview));
  });

  it('buyers cannot write their own purchase records', async () => {
    await assertFails(
      setDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.users, OTHER_BUYER, USER_SUBCOLLECTIONS.purchases, BOOK), {
        orderId: 'fake',
        purchasedAt: NOW,
      }),
    );
  });

  it('CA-2 and CA-3: one review per user and book, edits and deletes update the book', async () => {
    const db = dbAs(BUYER);
    const reviewRef = doc(db, COLLECTIONS.reviews, docIds.review(BOOK, BUYER));
    await assertFails(setDoc(doc(db, COLLECTIONS.reviews, 'otra_resena'), review(BUYER)));
    await assertSucceeds(setDoc(reviewRef, review(BUYER)));

    const edit = writeBatch(db);
    edit.update(reviewRef, { rating: 3, comment: 'Lo pensé mejor', updatedAt: NOW });
    edit.update(doc(db, COLLECTIONS.books, BOOK), { rating: 3, reviewCount: 1 });
    await assertSucceeds(edit.commit());

    const removal = writeBatch(db);
    removal.delete(reviewRef);
    removal.update(doc(db, COLLECTIONS.books, BOOK), { rating: 0, reviewCount: 0 });
    await assertSucceeds(removal.commit());
  });

  it('only buyers of the book can review it', async () => {
    await assertSucceeds(setDoc(doc(dbAs(BUYER), COLLECTIONS.reviews, docIds.review(BOOK, BUYER)), review(BUYER)));
    await assertFails(
      setDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.reviews, docIds.review(BOOK, OTHER_BUYER)), review(OTHER_BUYER)),
    );
  });

  it('rejects ratings out of range and reviews for someone else', async () => {
    const db = dbAs(BUYER);
    await assertFails(
      setDoc(doc(db, COLLECTIONS.reviews, docIds.review(BOOK, BUYER)), { ...review(BUYER), rating: 6 }),
    );
    await assertFails(setDoc(doc(db, COLLECTIONS.reviews, docIds.review(BOOK, OTHER_BUYER)), review(OTHER_BUYER)));
  });

  it('updates the book rating together with the review', async () => {
    const db = dbAs(BUYER);
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.reviews, docIds.review(BOOK, BUYER)), review(BUYER));
    batch.update(doc(db, COLLECTIONS.books, BOOK), { rating: 5, reviewCount: 1 });
    await assertSucceeds(batch.commit());
    await assertFails(updateDoc(doc(dbAs(OTHER_BUYER), COLLECTIONS.books, BOOK), { rating: 1, reviewCount: 2 }));
  });
});

describe('reports and audit log', () => {
  const report = {
    reporterId: BUYER,
    reporterName: 'Lector',
    targetType: 'book',
    targetId: BOOK,
    targetTitle: 'Ficciones',
    reason: 'Contenido inapropiado',
    details: '',
    status: 'pending',
    createdAt: NOW,
  };
  const reportId = docIds.report(BUYER, 'book', BOOK);

  it('users report, only admins resolve', async () => {
    await assertSucceeds(setDoc(doc(dbAs(BUYER), COLLECTIONS.reports, reportId), report));
    await assertFails(updateDoc(doc(dbAs(BUYER), COLLECTIONS.reports, reportId), { status: 'resolved' }));
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), COLLECTIONS.reports, reportId), {
        status: 'resolved',
        resolvedBy: ADMIN,
        resolvedAt: NOW,
      }),
    );
  });

  it('blocked users cannot report', async () => {
    await assertFails(
      setDoc(doc(dbAs(BLOCKED), COLLECTIONS.reports, docIds.report(BLOCKED, 'book', BOOK)), {
        ...report,
        reporterId: BLOCKED,
      }),
    );
  });

  it('only admins write the audit log and nobody edits it', async () => {
    const entry = {
      adminId: ADMIN,
      adminName: 'Admin',
      action: 'approve_book',
      targetType: 'book',
      targetId: BOOK,
      createdAt: NOW,
    };
    await assertSucceeds(setDoc(doc(dbAs(ADMIN), COLLECTIONS.auditLog, 'entry_1'), entry));
    await assertFails(setDoc(doc(dbAs(SELLER), COLLECTIONS.auditLog, 'entry_2'), { ...entry, adminId: SELLER }));
    await assertFails(updateDoc(doc(dbAs(ADMIN), COLLECTIONS.auditLog, 'entry_1'), { reason: 'cambio' }));
    await assertFails(deleteDoc(doc(dbAs(ADMIN), COLLECTIONS.auditLog, 'entry_1')));
    await assertFails(getDoc(doc(dbAs(BUYER), COLLECTIONS.auditLog, 'entry_1')));
  });
});
