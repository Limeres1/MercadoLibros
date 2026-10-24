import { collection, doc, DocumentData, FirestoreDataConverter } from 'firebase/firestore';

import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@/constants/firestore';
import { fromFirestoreData, withoutUndefined } from '@/lib/firestoreData';
import { db } from '@/services/firebase';
import {
  AuditLogEntry,
  Book,
  BookContent,
  CartEntry,
  FavoriteEntry,
  LibraryItem,
  Order,
  Report,
  Review,
  UserProfile,
} from '@/types';

function converter<T extends object>(idKey: keyof T & string): FirestoreDataConverter<T, DocumentData> {
  return {
    toFirestore: model => {
      const { [idKey]: _id, ...data } = model as Record<string, unknown>;
      return withoutUndefined(data);
    },
    fromFirestore: snapshot => ({ ...(fromFirestoreData(snapshot.data()) as object), [idKey]: snapshot.id }) as T,
  };
}

const typedCollection = <T extends object>(idKey: keyof T & string, path: string, ...segments: string[]) =>
  collection(db, path, ...segments).withConverter(converter<T>(idKey));

export const firestoreRefs = {
  users: () => typedCollection<UserProfile>('id', COLLECTIONS.users),
  user: (uid: string) => doc(firestoreRefs.users(), uid),
  books: () => typedCollection<Book>('id', COLLECTIONS.books),
  book: (bookId: string) => doc(firestoreRefs.books(), bookId),
  bookContent: (bookId: string) => doc(typedCollection<BookContent>('bookId', COLLECTIONS.bookContents), bookId),
  orders: () => typedCollection<Order>('id', COLLECTIONS.orders),
  reviews: () => typedCollection<Review>('id', COLLECTIONS.reviews),
  reports: () => typedCollection<Report>('id', COLLECTIONS.reports),
  auditLog: () => typedCollection<AuditLogEntry>('id', COLLECTIONS.auditLog),
  library: (uid: string) => typedCollection<LibraryItem>('id', COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.library),
  favorites: (uid: string) =>
    typedCollection<FavoriteEntry>('bookId', COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.favorites),
  cart: (uid: string) => typedCollection<CartEntry>('bookId', COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.cart),
};
