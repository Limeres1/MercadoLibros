import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useSession } from '@/features/auth/SessionProvider';
import { firestoreRefs } from '@/services/firestore';
import { AuditLogEntry } from '@/types';

export function useAuditLog() {
  const { currentUser } = useSession();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return onSnapshot(
      firestoreRefs.auditLog(),
      snapshot => {
        const logs = snapshot.docs
          .map(doc => doc.data())
          .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
        setEntries(logs);
        setIsLoading(false);
      },
      error => {
        console.warn('Error al cargar auditLog:', error);
        setIsLoading(false);
      },
    );
  }, [isAdmin]);

  return { entries, isLoading };
}
