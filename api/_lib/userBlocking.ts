import { Auth } from 'firebase-admin/auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';

import { COLLECTIONS } from '../../src/constants/firestore.js';
import { MODERATION_REASON_LENGTH } from '../../src/constants/statuses.js';

export const BLOCK_ERRORS = {
  unauthorized: 'Iniciá sesión como administrador.',
  forbidden: 'Sólo un administrador puede bloquear usuarios.',
  invalidRequest: `Indicá el usuario y un motivo de ${MODERATION_REASON_LENGTH.min} a ${MODERATION_REASON_LENGTH.max} caracteres.`,
  notFound: 'No encontramos ese usuario.',
  adminTarget: 'No se puede bloquear a otro administrador.',
  unavailable: 'No pudimos actualizar el usuario. Intentá de nuevo.',
};

export class BlockError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface BlockRequest {
  userId: string;
  blocked: boolean;
  reason: string;
}

export function parseBlockRequest(body: Record<string, unknown>): BlockRequest | null {
  const { userId, blocked, reason } = body;
  if (typeof userId !== 'string' || !userId || userId.length > 128 || userId.includes('/')) return null;
  if (typeof blocked !== 'boolean' || typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  if (trimmed.length < MODERATION_REASON_LENGTH.min || trimmed.length > MODERATION_REASON_LENGTH.max) return null;
  return { userId, blocked, reason: trimmed };
}

export async function setUserBlocked(db: Firestore, auth: Auth, adminId: string, request: BlockRequest) {
  const users = db.collection(COLLECTIONS.users);
  const [admin, target] = await Promise.all([users.doc(adminId).get(), users.doc(request.userId).get()]);
  if (admin.get('role') !== 'admin' || admin.get('isBlocked')) throw new BlockError(BLOCK_ERRORS.forbidden, 403);
  if (!target.exists) throw new BlockError(BLOCK_ERRORS.notFound, 404);
  if (target.get('role') === 'admin') throw new BlockError(BLOCK_ERRORS.adminTarget, 409);

  await auth.updateUser(request.userId, { disabled: request.blocked });
  if (request.blocked) await auth.revokeRefreshTokens(request.userId);

  const entry = db.collection(COLLECTIONS.auditLog).doc();
  const batch = db.batch();
  batch.update(target.ref, {
    isBlocked: request.blocked,
    blockReason: request.blocked ? request.reason : FieldValue.delete(),
  });
  batch.set(entry, {
    id: entry.id,
    adminId,
    adminName: admin.get('displayName') ?? 'Administrador',
    action: request.blocked ? 'block_user' : 'unblock_user',
    targetType: 'user',
    targetId: request.userId,
    targetLabel: `${target.get('displayName') ?? ''} (${target.get('email') ?? ''})`,
    reason: request.reason,
    createdAt: new Date().toISOString(),
  });
  try {
    await batch.commit();
  } catch (error) {
    await auth.updateUser(request.userId, { disabled: !request.blocked }).catch(() => undefined);
    throw error;
  }
}
