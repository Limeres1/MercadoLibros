import { useToast } from '@/components/ui/Toast';
import { useAuthModal } from '@/features/auth/AuthModalProvider';
import { useSession } from '@/features/auth/SessionProvider';

export function useRequireLogin() {
  const { currentUser } = useSession();
  const { openAuth } = useAuthModal();
  const { showToast } = useToast();

  return (message: string) => {
    if (currentUser) return currentUser;
    openAuth('login');
    showToast(message, 'info');
    return null;
  };
}
