import { useToast } from '../../components/ui/Toast';
import { useAuthModal } from './AuthModalProvider';
import { useSession } from './SessionProvider';

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
