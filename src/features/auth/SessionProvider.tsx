import React from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { useToast } from '@/components/ui/Toast';
import { FAVORITE_SHOWCASE_LIMIT } from '@/constants/statuses';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_USERS } from '@/data/initialData';
import { useAuthModal } from '@/features/auth/AuthModalProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { createId } from '@/lib/ids';
import { auth } from '@/services/firebase';
import { UserProfile, UserRole } from '@/types';

interface SessionContextValue {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  users: UserProfile[];
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  switchDemoRole: (role: UserRole) => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateFavoriteBookIds: (bookIds: string[]) => Promise<void>;
  setUserBlocked: (userId: string, blocked: boolean, reason?: string) => void;
}

const [Provider, useSession] = createSafeContext<SessionContextValue>('useSession');
export { useSession };

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { closeAuth } = useAuthModal();
  const [users, setUsers] = usePersistentState<UserProfile[]>(STORAGE_KEYS.users, INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = usePersistentState<string | null>(STORAGE_KEYS.session, null);

  const currentUser = users.find(user => user.id === currentUserId) ?? null;
  const currentRole: UserRole = currentUser ? currentUser.role : 'visitor';

  const switchDemoRole = (role: UserRole) => {
    if (role === 'visitor') {
      setCurrentUserId(null);
      showToast('Has cambiado al modo Visitante (No registrado).', 'info');
      return;
    }
    const user = users.find(candidate => candidate.role === role);
    if (!user) return;
    setCurrentUserId(user.id);
    showToast(`Sesión cambiada a ${user.displayName}`, 'success');
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    const foundUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      if (foundUser.isBlocked) {
        showToast(
          `Tu cuenta ha sido bloqueada. Motivo: ${foundUser.blockReason || 'Incumplimiento de términos'}`,
          'error',
        );
        return false;
      }
      setCurrentUserId(foundUser.id);
      closeAuth();
      showToast(`¡Bienvenido de vuelta, ${foundUser.displayName}!`, 'success');
      return true;
    }

    let profile: UserProfile;
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      profile = {
        id: user.uid,
        email: user.email || email,
        displayName: user.displayName || email.split('@')[0],
        role: 'buyer',
        createdAt: new Date().toISOString(),
        favoriteBookIds: [],
      };
    } catch {
      profile = {
        id: createId(),
        email,
        displayName: email.split('@')[0],
        role: 'buyer',
        createdAt: new Date().toISOString(),
        favoriteBookIds: [],
      };
    }
    setUsers(prev => [...prev.filter(user => user.id !== profile.id), profile]);
    setCurrentUserId(profile.id);
    closeAuth();
    showToast(`¡Bienvenido, ${profile.displayName}!`, 'success');
    return true;
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole): Promise<boolean> => {
    const uid = await createUserWithEmailAndPassword(auth, email, pass)
      .then(cred => cred.user.uid)
      .catch(() => createId());

    const newUser: UserProfile = {
      id: uid,
      email,
      displayName: name,
      role: role === 'seller' ? 'seller' : 'buyer',
      bio: `Usuario registrado como ${role === 'seller' ? 'Vendedor de libros' : 'Comprador y lector'}`,
      favoriteBookIds: [],
      createdAt: new Date().toISOString(),
      isBlocked: false,
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    closeAuth();
    showToast(`¡Cuenta de ${newUser.role === 'seller' ? 'Vendedor' : 'Comprador'} creada exitosamente!`, 'success');
    return true;
  };

  const logoutUser = async () => {
    await signOut(auth).catch(() => undefined);
    setCurrentUserId(null);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    await sendPasswordResetEmail(auth, email).catch(() => undefined);
    showToast(`Si existe una cuenta con ${email}, te enviamos un correo para restablecer la contraseña.`, 'info');
    return true;
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(user => (user.id === currentUser.id ? { ...user, ...data } : user)));
    showToast('Perfil actualizado con éxito.', 'success');
  };

  const updateFavoriteBookIds = async (bookIds: string[]) => {
    if (!currentUser) return;
    setUsers(prev =>
      prev.map(user =>
        user.id === currentUser.id ? { ...user, favoriteBookIds: bookIds.slice(0, FAVORITE_SHOWCASE_LIMIT) } : user,
      ),
    );
    showToast('Tus libros favoritos del perfil han sido actualizados.', 'success');
  };

  const setUserBlocked = (userId: string, blocked: boolean, reason?: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === userId
          ? {
              ...user,
              isBlocked: blocked,
              blockReason: blocked ? reason || 'Infracción de normas comunitarias' : undefined,
            }
          : user,
      ),
    );
  };

  return (
    <Provider
      value={{
        currentUser,
        currentRole,
        users,
        loginWithEmail,
        registerWithEmail,
        logoutUser,
        sendPasswordReset,
        switchDemoRole,
        updateUserProfile,
        updateFavoriteBookIds,
        setUserBlocked,
      }}
    >
      {children}
    </Provider>
  );
};
