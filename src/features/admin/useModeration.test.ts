import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModeration } from '@/features/admin/useModeration';
import { Book, Report } from '@/types';

const fake = vi.hoisted(() => ({
  writes: [] as { type: string; path: string; data?: Record<string, unknown> }[],
  commit: vi.fn(),
  showToast: vi.fn(),
  postApi: vi.fn(),
  deleteReview: vi.fn(),
}));

const batch = {
  update: (ref: { path: string }, data: Record<string, unknown>) =>
    fake.writes.push({ type: 'update', path: ref.path, data }),
  set: (ref: { path: string }, data: Record<string, unknown>) =>
    fake.writes.push({ type: 'set', path: ref.path, data }),
  delete: (ref: { path: string }) => fake.writes.push({ type: 'delete', path: ref.path }),
  commit: () => fake.commit(),
};

vi.mock('firebase/firestore', () => ({
  writeBatch: () => batch,
  deleteField: () => 'DELETE',
  doc: (collection: { path: string }, id: string) => ({ path: `${collection.path}/${id}` }),
}));
vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/firestore', () => ({
  firestoreRefs: {
    book: (id: string) => ({ path: `books/${id}` }),
    reports: () => ({ path: 'reports' }),
    auditLog: () => ({ path: 'auditLog' }),
  },
}));
vi.mock('@/services/api', () => ({ postApi: fake.postApi }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: fake.showToast }) }));
vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ currentUser: { id: 'admin-1', displayName: 'Lev', role: 'admin' } }),
}));
vi.mock('@/features/catalog/reviews/reviewsService', () => ({
  deleteReview: (reviewId: string, alsoWrite: (writer: typeof batch) => void) => {
    fake.deleteReview(reviewId);
    batch.delete({ path: `reviews/${reviewId}` });
    alsoWrite(batch);
    return fake.commit();
  },
}));

const book = { id: 'book-1', title: 'Ficciones' } as Book;
const report = (targetType: Report['targetType']) =>
  ({ id: 'report-1', targetType, targetId: 'target-1', targetTitle: 'Contenido', reason: 'Spam' }) as Report;

const auditWrites = () => fake.writes.filter(write => write.path.startsWith('auditLog/')).map(write => write.data);

describe('useModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.writes = [];
    fake.commit.mockResolvedValue(undefined);
  });

  const moderation = () => renderHook(() => useModeration()).result.current;

  it('CA-3: approving writes the book and its audit entry in one batch', async () => {
    await moderation().approveBook(book);
    expect(fake.commit).toHaveBeenCalledTimes(1);
    expect(fake.writes[0]).toMatchObject({
      path: 'books/book-1',
      data: { status: 'published', rejectionReason: 'DELETE' },
    });
    expect(auditWrites()).toEqual([
      expect.objectContaining({
        adminId: 'admin-1',
        adminName: 'Lev',
        action: 'approve_book',
        targetId: 'book-1',
        targetLabel: 'Ficciones',
        createdAt: expect.any(String),
      }),
    ]);
  });

  it('CA-1/CA-3: rejecting stores the reason on the book and in the audit log', async () => {
    await moderation().rejectBook(book, 'Falta la sinopsis.');
    expect(fake.writes[0].data).toMatchObject({ status: 'rejected', rejectionReason: 'Falta la sinopsis.' });
    expect(auditWrites()[0]).toMatchObject({ action: 'reject_book', reason: 'Falta la sinopsis.' });
  });

  it('resolving a book report withdraws the book, closes the report and logs both actions', async () => {
    await moderation().resolveReport(report('book'), 'remove_target', 'Plagio confirmado.');
    expect(fake.writes.find(write => write.path === 'books/target-1')?.data).toMatchObject({
      status: 'withdrawn',
      rejectionReason: 'Plagio confirmado.',
    });
    expect(fake.writes.find(write => write.path === 'reports/report-1')?.data).toMatchObject({
      status: 'resolved',
      adminNote: 'Plagio confirmado.',
      resolvedBy: 'admin-1',
    });
    expect(auditWrites().map(entry => entry?.action)).toEqual(['withdraw_book', 'resolve_report']);
    expect(fake.commit).toHaveBeenCalledTimes(1);
  });

  it('resolving a review report deletes the review in the same batch as the report and audit', async () => {
    await moderation().resolveReport(report('review'), 'remove_target', 'Insultos al autor.');
    expect(fake.deleteReview).toHaveBeenCalledWith('target-1');
    expect(fake.writes.map(write => write.type)).toEqual(['delete', 'set', 'update', 'set']);
    expect(auditWrites().map(entry => entry?.action)).toEqual(['delete_review', 'resolve_report']);
  });

  it('dismissing only closes the report and logs it', async () => {
    await moderation().resolveReport(report('book'), 'dismiss', 'No infringe las normas.');
    expect(fake.writes.some(write => write.path.startsWith('books/'))).toBe(false);
    expect(auditWrites()[0]).toMatchObject({ action: 'dismiss_report', reason: 'No infringe las normas.' });
  });

  it('shows the error and reports failure when the batch is rejected', async () => {
    fake.commit.mockRejectedValue({ code: 'permission-denied' });
    expect(await moderation().approveBook(book)).toBe(false);
    expect(fake.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('blocks through the server function', async () => {
    fake.postApi.mockResolvedValue({ blocked: true });
    const user = { id: 'buyer-1', displayName: 'Renata' } as Parameters<
      ReturnType<typeof useModeration>['setUserBlocked']
    >[0];
    expect(await moderation().setUserBlocked(user, true, 'Fraude reiterado')).toBe(true);
    expect(fake.postApi).toHaveBeenCalledWith('/api/admin/block', {
      userId: 'buyer-1',
      blocked: true,
      reason: 'Fraude reiterado',
    });
  });
});
