import { doc, setDoc } from 'firebase/firestore';

import { createId } from '@/lib/ids';
import { firestoreRefs } from '@/services/firestore';
import { AuditLogEntry, UserProfile } from '@/types';

type AuditEvent = Pick<AuditLogEntry, 'action' | 'targetType' | 'targetId' | 'reason'>;

export function logAdminAction(admin: UserProfile, event: AuditEvent) {
  const id = createId();
  return setDoc(doc(firestoreRefs.auditLog(), id), {
    id,
    adminId: admin.id,
    adminName: admin.displayName,
    ...event,
    createdAt: new Date().toISOString(),
  });
}
