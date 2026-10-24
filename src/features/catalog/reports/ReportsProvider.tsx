import React from 'react';

import { useToast } from '@/components/ui/Toast';
import { docIds } from '@/constants/firestore';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { INITIAL_REPORTS } from '@/data/initialData';
import { useSession } from '@/features/auth/SessionProvider';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createSafeContext } from '@/lib/createSafeContext';
import { Report } from '@/types';

export interface ReportTarget {
  type: 'book' | 'review';
  id: string;
  title: string;
}

interface ReportsContextValue {
  reports: Report[];
  createReport: (target: ReportTarget, reason: string, details: string) => Promise<void>;
  setReportStatus: (reportId: string, status: Report['status'], adminNote?: string) => void;
}

const [Provider, useReports] = createSafeContext<ReportsContextValue>('useReports');
export { useReports };

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [reports, setReports] = usePersistentState<Report[]>(STORAGE_KEYS.reports, INITIAL_REPORTS);

  const createReport = async (target: ReportTarget, reason: string, details: string) => {
    if (!currentUser) return;
    const report: Report = {
      id: docIds.report(currentUser.id, target.type, target.id),
      reporterId: currentUser.id,
      reporterName: currentUser.displayName,
      targetType: target.type,
      targetId: target.id,
      targetTitle: target.title,
      reason,
      details,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [report, ...prev.filter(existing => existing.id !== report.id)]);
    showToast('Denuncia enviada. Un administrador la revisará a la brevedad.', 'success');
  };

  const setReportStatus = (reportId: string, status: Report['status'], adminNote?: string) => {
    setReports(prev => prev.map(report => (report.id === reportId ? { ...report, status, adminNote } : report)));
  };

  return <Provider value={{ reports, createReport, setReportStatus }}>{children}</Provider>;
};
