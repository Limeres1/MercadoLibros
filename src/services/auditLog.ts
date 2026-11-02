import { doc, WriteBatch } from 'firebase/firestore';

import { createId } from '@/lib/ids';
import { firestoreRefs } from '@/services/firestore';
import { AuditLogEntry, UserProfile } from '@/types';

export type AuditEvent = Pick<AuditLogEntry, 'action' | 'targetType' | 'targetId' | 'targetLabel' | 'reason'>;

export function addAuditEntry(batch: WriteBatch, admin: UserProfile, event: AuditEvent) {
  const id = createId();
  const entry: AuditLogEntry = {
    id,
    adminId: admin.id,
    adminName: admin.displayName,
    ...event,
    createdAt: new Date().toISOString(),
  };
  batch.set(doc(firestoreRefs.auditLog(), id), entry);
}
