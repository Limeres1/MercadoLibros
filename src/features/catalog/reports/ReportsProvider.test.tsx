import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportsProvider, useReports } from '@/features/catalog/reports/ReportsProvider';

const mocks = vi.hoisted(() => ({
  currentUser: null as null | { id: string; displayName: string; role: 'buyer' | 'admin' },
  showToast: vi.fn(),
  loginPrompt: vi.fn(),
  doc: vi.fn((_collection: unknown, id: string) => ({ id })),
  reportListener: null as null | ((snapshot: { docs: { data: () => unknown }[] }) => void),
  onSnapshot: vi.fn((_query: unknown, listener: (snapshot: { docs: { data: () => unknown }[] }) => void) => {
    mocks.reportListener = listener;
    return () => undefined;
  }),
  query: vi.fn((collection: unknown, ...constraints: unknown[]) => ({ collection, constraints })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock('@/features/auth/SessionProvider', () => ({
  useSession: () => ({ currentUser: mocks.currentUser }),
}));
vi.mock('@/features/auth/useRequireLogin', () => ({
  useRequireLogin: () => (message: string) => {
    mocks.loginPrompt(message);
    return mocks.currentUser;
  },
}));
vi.mock('@/services/firestore', () => ({ firestoreRefs: { reports: () => ({ collection: 'reports' }) } }));
vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  onSnapshot: mocks.onSnapshot,
  query: mocks.query,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  where: mocks.where,
}));

let reports: ReturnType<typeof useReports>;

const ReportsProbe: React.FC = () => {
  reports = useReports();
  return null;
};

const target = { type: 'book' as const, id: 'book-1', title: 'Libro de prueba' };

describe('ReportsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { id: 'buyer-1', displayName: 'Lector', role: 'buyer' };
    mocks.setDoc.mockResolvedValue(undefined);
  });

  it('creates a pending report without reading the not-yet-created document', async () => {
    render(
      <ReportsProvider>
        <ReportsProbe />
      </ReportsProvider>,
    );

    await act(async () => {
      expect(await reports.createReport(target, 'Otro motivo', '')).toBe(true);
    });

    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc.mock.calls[0][1]).toMatchObject({
      reporterId: 'buyer-1',
      targetType: 'book',
      targetId: 'book-1',
      reason: 'Otro motivo',
      details: '',
      status: 'pending',
    });
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      'Denuncia enviada. Un administrador la revisará a la brevedad.',
      'success',
    );
  });

  it('asks visitors to sign in and does not create a report', async () => {
    mocks.currentUser = null;
    render(
      <ReportsProvider>
        <ReportsProbe />
      </ReportsProvider>,
    );

    await act(async () => {
      expect(await reports.createReport(target, 'Otro motivo', '')).toBe(false);
    });

    expect(mocks.loginPrompt).toHaveBeenCalledWith('Iniciá sesión para denunciar contenido.');
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('does not resubmit a report already present in the user report list', async () => {
    render(
      <ReportsProvider>
        <ReportsProbe />
      </ReportsProvider>,
    );
    const report = {
      id: 'buyer-1_book_book-1',
      reporterId: 'buyer-1',
      targetType: 'book',
      targetId: 'book-1',
      createdAt: new Date().toISOString(),
    };

    await act(async () => {
      mocks.reportListener?.({ docs: [{ data: () => report }] });
    });
    await act(async () => {
      expect(await reports.createReport(target, 'Otro motivo', '')).toBe(false);
    });

    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenLastCalledWith('Ya enviaste una denuncia sobre este contenido.', 'info');
  });
});
