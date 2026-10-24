import React, { useCallback, useState } from 'react';

import { createSafeContext } from '@/lib/createSafeContext';

export type AuthTab = 'login' | 'register' | 'forgot';

interface AuthModalContextValue {
  isAuthOpen: boolean;
  authTab: AuthTab;
  setAuthTab: (tab: AuthTab) => void;
  openAuth: (tab?: AuthTab) => void;
  closeAuth: () => void;
}

const [Provider, useAuthModal] = createSafeContext<AuthModalContextValue>('useAuthModal');
export { useAuthModal };

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('login');

  const openAuth = useCallback((tab: AuthTab = 'login') => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  return <Provider value={{ isAuthOpen, authTab, setAuthTab, openAuth, closeAuth }}>{children}</Provider>;
};
