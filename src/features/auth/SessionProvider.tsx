import React from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { UserProfile, UserRole } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';
import { auth } from '../../services/firebase';
import { createSafeContext } from '../../lib/createSafeContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useToast } from '../../components/ui/Toast';
import { useAuthModal } from './AuthModalProvider';
import { STORAGE_KEYS } from '../../constants/storageKeys';

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

  const currentUser = users.find(u => u.id === currentUserId) ?? null;
  const currentRole: UserRole = currentUser ? currentUser.role : 'visitor';

  const switchDemoRole = (role: UserRole) => {
    if (role === 'visitor') {
      setCurrentUserId(null);
      showToast('Has cambiado al modo Visitante (No registrado).', 'info');
      return;
    }
    const user = users.find(u => u.role === role);
    if (!user) return;
    setCurrentUserId(user.id);
    showToast(`Sesión cambiada a ${user.displayName}`, 'success');
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      if (foundUser.isBlocked) {
        showToast(`Tu cuenta ha sido bloqueada. Motivo: ${foundUser.blockReason || 'Incumplimiento de términos'}`, 'error');
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
        id: 'user_' + Date.now(),
        email,
        displayName: email.split('@')[0],
        role: 'buyer',
        createdAt: new Date().toISOString(),
        favoriteBookIds: [],
      };
    }
    setUsers(prev => [...prev.filter(u => u.id !== profile.id), profile]);
    setCurrentUserId(profile.id);
    closeAuth();
    showToast(`¡Bienvenido, ${profile.displayName}!`, 'success');
    return true;
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole): Promise<boolean> => {
    let uid = 'user_' + Date.now();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      uid = cred.user.uid;
    } catch {
    }

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
    try {
      await signOut(auth);
    } catch {
    }
    setCurrentUserId(null);
    showToast('Sesión cerrada correctamente.', 'info');
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
    }
    showToast(`Si existe una cuenta con ${email}, te enviamos un correo para restablecer la contraseña.`, 'info');
    return true;
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, ...data } : u)));
    showToast('Perfil actualizado con éxito.', 'success');
  };

  const updateFavoriteBookIds = async (bookIds: string[]) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, favoriteBookIds: bookIds.slice(0, 4) } : u)));
    showToast('Tus 4 libros favoritos han sido actualizados en tu perfil.', 'success');
  };

  const setUserBlocked = (userId: string, blocked: boolean, reason?: string) => {
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, isBlocked: blocked, blockReason: blocked ? reason || 'Infracción de normas comunitarias' : undefined }
          : u
      )
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
