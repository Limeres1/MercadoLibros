import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/Toast';
import { AuthModalProvider } from '@/features/auth/AuthModalProvider';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { SignupRole, UserProfile } from '@/types';

const firebase = vi.hoisted(() => ({
  authListener: (() => undefined) as (user: unknown) => void,
  profileListener: (() => undefined) as (snapshot: unknown) => void,
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@/services/firebase', () => ({ auth: {} }));
vi.mock('@/services/firestore', () => ({
  firestoreRefs: { user: (uid: string) => ({ uid }), users: () => ({}) },
}));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth: unknown, listener: (user: unknown) => void) => {
    firebase.authListener = listener;
    return () => undefined;
  },
  createUserWithEmailAndPassword: firebase.createUserWithEmailAndPassword,
  signInWithEmailAndPassword: firebase.signInWithEmailAndPassword,
  sendPasswordResetEmail: firebase.sendPasswordResetEmail,
  signInWithPopup: vi.fn(),
  signOut: firebase.signOut,
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('firebase/firestore', () => ({
  onSnapshot: (_ref: unknown, listener: (snapshot: unknown) => void) => {
    firebase.profileListener = listener;
    return () => undefined;
  },
  getDoc: firebase.getDoc,
  setDoc: firebase.setDoc,
  updateDoc: vi.fn(),
  deleteField: vi.fn(),
}));

const firebaseUser = { uid: 'uid-1', email: 'lectora@test.com', displayName: null, photoURL: null };
const missingDoc = { exists: () => false };
const existingDoc = (profile: Partial<UserProfile>) => ({ exists: () => true, data: () => profile });

let session: ReturnType<typeof useSession>;

const SessionProbe: React.FC = () => {
  session = useSession();
  return <p>{session.isAuthLoading ? 'cargando' : (session.currentUser?.displayName ?? 'visitante')}</p>;
};

const renderSession = () =>
  render(
    <ToastProvider>
      <AuthModalProvider>
        <SessionProvider>
          <SessionProbe />
        </SessionProvider>
      </AuthModalProvider>
    </ToastProvider>,
  );

describe('SessionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebase.signOut.mockResolvedValue(undefined);
    firebase.setDoc.mockResolvedValue(undefined);
    firebase.getDoc.mockResolvedValue(missingDoc);
  });

  it('stays loading until Firebase restores the session', () => {
    renderSession();
    expect(screen.getByText('cargando')).toBeInTheDocument();
    act(() => firebase.authListener(null));
    expect(screen.getByText('visitante')).toBeInTheDocument();
  });

  it('registers a seller profile without storing the password', async () => {
    firebase.createUserWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    renderSession();

    await act(async () => {
      expect(await session.registerWithEmail('lectora@test.com', 'secreta123', 'Laura', 'seller')).toBe(true);
    });

    const [, profile] = firebase.setDoc.mock.calls[0];
    expect(profile).toMatchObject({ id: 'uid-1', displayName: 'Laura', role: 'seller', isBlocked: false });
    expect(JSON.stringify(profile)).not.toContain('secreta123');
  });

  it('never creates an admin from the sign up form', async () => {
    firebase.createUserWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    renderSession();

    await act(async () => {
      await session.registerWithEmail('lectora@test.com', 'secreta123', 'Laura', 'admin' as SignupRole);
    });

    expect(firebase.setDoc.mock.calls[0][1].role).toBe('buyer');
  });

  it('shows a clear error when the email is already registered', async () => {
    firebase.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });
    renderSession();

    await act(async () => {
      expect(await session.registerWithEmail('lectora@test.com', 'secreta123', 'Laura', 'buyer')).toBe(false);
    });

    expect(screen.getByText('Ya existe una cuenta con ese email.')).toBeInTheDocument();
  });

  it('rejects a wrong password', async () => {
    firebase.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderSession();

    await act(async () => {
      expect(await session.loginWithEmail('lectora@test.com', 'mala')).toBe(false);
    });

    expect(screen.getByText('Email o contraseña incorrectos.')).toBeInTheDocument();
  });

  it('signs out a blocked user', () => {
    renderSession();
    act(() => firebase.authListener(firebaseUser));
    act(() => firebase.profileListener(existingDoc({ displayName: 'Laura', isBlocked: true, blockReason: 'Spam' })));

    expect(firebase.signOut).toHaveBeenCalled();
    expect(screen.getByText('visitante')).toBeInTheDocument();
    expect(screen.getByText('Tu cuenta fue bloqueada. Motivo: Spam')).toBeInTheDocument();
  });

  it('shows a neutral message when resetting the password', async () => {
    firebase.sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    renderSession();

    await act(async () => {
      expect(await session.sendPasswordReset('nadie@test.com')).toBe(true);
    });

    expect(
      screen.getByText(
        'Si existe una cuenta con nadie@test.com, te enviamos un correo para restablecer la contraseña.',
      ),
    ).toBeInTheDocument();
  });
});
