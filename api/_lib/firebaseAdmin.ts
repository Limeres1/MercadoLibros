import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  const [existing] = getApps();
  if (existing) return existing;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  return initializeApp({
    credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault(),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

export const adminDb = () => getFirestore(adminApp());

export async function verifyRequestUser(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  return getAuth(adminApp())
    .verifyIdToken(token)
    .then(decoded => decoded.uid)
    .catch(() => null);
}
