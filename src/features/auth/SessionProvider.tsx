import React, { useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { deleteField, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { FAVORITE_SHOWCASE_LIMIT, SIGNUP_ROLES } from '@/constants/statuses';
import { useAuthModal } from '@/features/auth/AuthModalProvider';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { withoutUndefined } from '@/lib/firestoreData';
import { auth } from '@/services/firebase';
import { firestoreRefs } from '@/services/firestore';
import { SignupRole, UserProfile, UserRole } from '@/types';

type EditableProfile = Pick<UserProfile, 'displayName' | 'photoURL' | 'bio' | 'location' | 'phone'>;

interface SessionContextValue {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  isAuthLoading: boolean;
  users: UserProfile[];
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: (role: SignupRole) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string, role: SignupRole) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateUserProfile: (data: Partial<EditableProfile>) => Promise<void>;
  updateFavoriteBookIds: (bookIds: string[]) => Promise<void>;
  setUserBlocked: (userId: string, blocked: boolean, reason?: string) => Promise<boolean>;
}

const [Provider, useSession] = createSafeContext<SessionContextValue>('useSession');
export { useSession };

const DEFAULT_BLOCK_REASON = 'Incumplimiento de términos';

const buildProfile = (user: User, displayName: string, role: SignupRole): UserProfile => ({
  id: user.uid,
  email: user.email ?? '',
  displayName,
  role: SIGNUP_ROLES.includes(role) ? role : 'buyer',
  photoURL: user.photoURL ?? undefined,
  bio: role === 'seller' ? 'Vendedor de libros en Mercado Libros' : 'Comprador y lector en Mercado Libros',
  favoriteBookIds: [],
  isBlocked: false,
  createdAt: new Date().toISOString(),
});

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { closeAuth } = useAuthModal();
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(
    () =>
      onAuthStateChanged(auth, user => {
        setAuthUid(user?.uid ?? null);
        if (!user) {
          setCurrentUser(null);
          setIsAuthLoading(false);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!authUid) return;
    setIsAuthLoading(true);
    return onSnapshot(
      firestoreRefs.user(authUid),
      snapshot => {
        const profile = snapshot.exists() ? snapshot.data() : null;
        if (profile?.isBlocked) {
          showToastRef.current(
            `Tu cuenta fue bloqueada. Motivo: ${profile.blockReason || DEFAULT_BLOCK_REASON}`,
            'error',
          );
          setCurrentUser(null);
          signOut(auth).catch(() => undefined);
        } else {
          setCurrentUser(profile);
        }
        setIsAuthLoading(false);
      },
      error => {
        showToastRef.current(getErrorMessage(error), 'error');
        setCurrentUser(null);
        setIsAuthLoading(false);
      },
    );
  }, [authUid]);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }
    return onSnapshot(firestoreRefs.users(), snapshot => setUsers(snapshot.docs.map(userDoc => userDoc.data())));
  }, [isAdmin]);

  const currentRole: UserRole = currentUser ? currentUser.role : 'visitor';

  const finishLogin = async (user: User, role: SignupRole, displayName?: string): Promise<boolean> => {
    const profileRef = firestoreRefs.user(user.uid);
    const snapshot = await getDoc(profileRef);
    let profile = snapshot.exists() ? snapshot.data() : null;
    if (!profile) {
      profile = buildProfile(user, displayName || user.displayName || user.email?.split('@')[0] || 'Lector', role);
      await setDoc(profileRef, profile);
    }
    if (profile.isBlocked) return false;
    closeAuth();
    showToast(`¡Bienvenido, ${profile.displayName}!`, 'success');
    return true;
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      return await finishLogin(user, 'buyer');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const loginWithGoogle = async (role: SignupRole): Promise<boolean> => {
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      return await finishLogin(user, role);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: SignupRole): Promise<boolean> => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: name });
      return await finishLogin(user, role, name);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const logoutUser = async () => {
    await signOut(auth).catch(() => undefined);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/invalid-email') {
        showToast(getErrorMessage(error), 'error');
        return false;
      }
    }
    showToast(`Si existe una cuenta con ${email}, te enviamos un correo para restablecer la contraseña.`, 'info');
    return true;
  };

  const updateUserProfile = async (data: Partial<EditableProfile>) => {
    if (!currentUser) return;
    try {
      await updateDoc(firestoreRefs.user(currentUser.id), withoutUndefined(data));
      showToast('Perfil actualizado con éxito.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const updateFavoriteBookIds = async (bookIds: string[]) => {
    if (!currentUser) return;
    try {
      await updateDoc(firestoreRefs.user(currentUser.id), {
        favoriteBookIds: bookIds.slice(0, FAVORITE_SHOWCASE_LIMIT),
      });
      showToast('Tus libros favoritos del perfil han sido actualizados.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const setUserBlocked = async (userId: string, blocked: boolean, reason?: string): Promise<boolean> => {
    try {
      await updateDoc(firestoreRefs.user(userId), {
        isBlocked: blocked,
        blockReason: blocked ? reason || 'Infracción de normas comunitarias' : deleteField(),
      });
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  return (
    <Provider
      value={{
        currentUser,
        currentRole,
        isAuthLoading,
        users,
        loginWithEmail,
        loginWithGoogle,
        registerWithEmail,
        logoutUser,
        sendPasswordReset,
        updateUserProfile,
        updateFavoriteBookIds,
        setUserBlocked,
      }}
    >
      {children}
    </Provider>
  );
};
