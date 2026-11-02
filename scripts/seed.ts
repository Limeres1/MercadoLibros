import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { COLLECTIONS } from '@/constants/firestore';
import { INITIAL_BOOK_CONTENTS, INITIAL_BOOKS, INITIAL_USERS } from '@/data/initialData';

const password = process.env.SEED_DEMO_PASSWORD;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!password || password.length < 6 || !projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    'Faltan GOOGLE_APPLICATION_CREDENTIALS, VITE_FIREBASE_PROJECT_ID o SEED_DEMO_PASSWORD (mín. 6) en .env.local.',
  );
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();

for (const { id, email, displayName, photoURL } of INITIAL_USERS) {
  const account = { email, password, displayName, photoURL, emailVerified: true };
  const exists = await auth.getUser(id).then(
    () => true,
    () => false,
  );
  await (exists ? auth.updateUser(id, account) : auth.createUser({ uid: id, ...account }));
  console.log(`${exists ? 'actualizada' : 'creada'} cuenta ${email}`);
}

const batch = db.batch();
INITIAL_USERS.forEach(({ id, ...profile }) => batch.set(db.collection(COLLECTIONS.users).doc(id), profile));
INITIAL_BOOKS.forEach(({ id, ...book }) => batch.set(db.collection(COLLECTIONS.books).doc(id), book));
INITIAL_BOOK_CONTENTS.forEach(({ bookId, ...content }) =>
  batch.set(db.collection(COLLECTIONS.bookContents).doc(bookId), content),
);
await batch.commit();

console.log(
  `Firestore: ${INITIAL_USERS.length} usuarios, ${INITIAL_BOOKS.length} libros, ${INITIAL_BOOK_CONTENTS.length} contenidos.`,
);
