import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BLOCK_ERRORS } from '@api/_lib/userBlocking';
import { POST } from '@api/admin/block';

const fake = vi.hoisted(() => ({
  callerId: 'admin-1' as string | null,
  users: {} as Record<string, Record<string, unknown>>,
  updateUser: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  batchUpdate: vi.fn(),
  batchSet: vi.fn(),
  commit: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { delete: () => 'DELETE' } }));
vi.mock('@api/_lib/firebaseAdmin', () => ({
  verifyRequestUser: async () => fake.callerId,
  adminAuth: () => ({ updateUser: fake.updateUser, revokeRefreshTokens: fake.revokeRefreshTokens }),
  adminDb: () => ({
    collection: (name: string) => ({
      doc: (id?: string) =>
        name === 'auditLog'
          ? { id: 'audit-1' }
          : {
              get: async () => ({
                exists: Boolean(fake.users[id as string]),
                ref: { path: `users/${id}` },
                get: (field: string) => fake.users[id as string]?.[field],
              }),
            },
    }),
    batch: () => ({ update: fake.batchUpdate, set: fake.batchSet, commit: fake.commit }),
  }),
}));

const request = (body: object) =>
  new Request('http://localhost/api/admin/block', { method: 'POST', body: JSON.stringify(body) });

describe('api/admin/block', () => {
  beforeEach(() => {
    fake.callerId = 'admin-1';
    fake.users = {
      'admin-1': { role: 'admin', displayName: 'Lev', isBlocked: false },
      'admin-2': { role: 'admin', displayName: 'Otra admin' },
      'buyer-1': { role: 'buyer', displayName: 'Renata', email: 'renata@test.com' },
      'seller-1': { role: 'seller', displayName: 'Tinta Sur', email: 'tinta@test.com' },
    };
    fake.commit.mockResolvedValue(undefined);
    fake.updateUser.mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it('CA-2/CA-3: blocking disables the account, closes its sessions and writes the audit entry', async () => {
    const response = await POST(request({ userId: 'buyer-1', blocked: true, reason: '  Fraude reiterado  ' }));
    expect(response.status).toBe(200);
    expect(fake.updateUser).toHaveBeenCalledWith('buyer-1', { disabled: true });
    expect(fake.revokeRefreshTokens).toHaveBeenCalledWith('buyer-1');
    expect(fake.batchUpdate).toHaveBeenCalledWith(expect.anything(), {
      isBlocked: true,
      blockReason: 'Fraude reiterado',
    });
    expect(fake.batchSet).toHaveBeenCalledWith(
      { id: 'audit-1' },
      expect.objectContaining({
        id: 'audit-1',
        adminId: 'admin-1',
        adminName: 'Lev',
        action: 'block_user',
        targetType: 'user',
        targetId: 'buyer-1',
        targetLabel: 'Renata (renata@test.com)',
        reason: 'Fraude reiterado',
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it('unblocking re-enables the account, clears the reason and is audited', async () => {
    await POST(request({ userId: 'seller-1', blocked: false, reason: 'Apelación aceptada' }));
    expect(fake.updateUser).toHaveBeenCalledWith('seller-1', { disabled: false });
    expect(fake.revokeRefreshTokens).not.toHaveBeenCalled();
    expect(fake.batchUpdate).toHaveBeenCalledWith(expect.anything(), { isBlocked: false, blockReason: 'DELETE' });
    expect(fake.batchSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'unblock_user' }));
  });

  it('requires a reason and a signed in admin, and never blocks another admin', async () => {
    expect((await POST(request({ userId: 'buyer-1', blocked: true, reason: '  ' }))).status).toBe(400);
    expect((await POST(request({ userId: 'buyer-1', blocked: 'yes', reason: 'Motivo válido' }))).status).toBe(400);
    expect(await (await POST(request({ userId: 'admin-2', blocked: true, reason: 'Motivo válido' }))).json()).toEqual({
      error: BLOCK_ERRORS.adminTarget,
    });
    expect((await POST(request({ userId: 'ghost', blocked: true, reason: 'Motivo válido' }))).status).toBe(404);
    fake.callerId = 'seller-1';
    expect((await POST(request({ userId: 'buyer-1', blocked: true, reason: 'Motivo válido' }))).status).toBe(403);
    fake.callerId = null;
    expect((await POST(request({ userId: 'buyer-1', blocked: true, reason: 'Motivo válido' }))).status).toBe(401);
    expect(fake.updateUser).not.toHaveBeenCalled();
  });

  it('re-enables the account if the profile could not be updated', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.commit.mockRejectedValue(new Error('firestore down'));
    const response = await POST(request({ userId: 'buyer-1', blocked: true, reason: 'Fraude reiterado' }));
    expect(response.status).toBe(503);
    expect(fake.updateUser).toHaveBeenLastCalledWith('buyer-1', { disabled: false });
  });
});
