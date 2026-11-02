import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@api/reader/sync';

const fake = vi.hoisted(() => ({ verify: vi.fn(), sync: vi.fn() }));
vi.mock('@api/_lib/firebaseAdmin', () => ({
  adminDb: () => ({}),
  verifyRequestUser: (...args: unknown[]) => fake.verify(...args),
}));
vi.mock('@api/_lib/reader', async importOriginal => {
  const original = await importOriginal<typeof import('@api/_lib/reader')>();
  return { ...original, synchronizeReaderPages: (...args: unknown[]) => fake.sync(...args) };
});

const request = (body: object) =>
  new Request('http://localhost/api/reader/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  fake.verify.mockReset().mockResolvedValue('owner');
  fake.sync.mockReset().mockResolvedValue({ totalPages: 3, lastReadPage: 2 });
});

describe('reader synchronization endpoint', () => {
  it('requires authentication', async () => {
    fake.verify.mockResolvedValue(null);
    expect((await POST(request({ bookId: 'book' }))).status).toBe(401);
    expect(fake.sync).not.toHaveBeenCalled();
  });

  it.each(['', 'users/other', 4, null])('rejects an invalid book id (%s)', async bookId => {
    expect((await POST(request({ bookId }))).status).toBe(400);
    expect(fake.sync).not.toHaveBeenCalled();
  });

  it('uses only the verified user and ignores client supplied page counts', async () => {
    const response = await POST(request({ bookId: 'book', userId: 'other', totalPages: 999, lastReadPage: 999 }));
    expect(response.status).toBe(200);
    expect(fake.sync).toHaveBeenCalledWith({}, 'owner', 'book');
    expect(await response.json()).toEqual({ totalPages: 3, lastReadPage: 2 });
  });
});
