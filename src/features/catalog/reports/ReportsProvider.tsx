import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';

import { useToast } from '@/components/ui/Toast';
import { docIds } from '@/constants/firestore';
import { useSession } from '@/features/auth/SessionProvider';
import { useRequireLogin } from '@/features/auth/useRequireLogin';
import { createSafeContext } from '@/lib/createSafeContext';
import { getErrorMessage } from '@/lib/errors';
import { firestoreRefs } from '@/services/firestore';
import { Report } from '@/types';

export interface ReportTarget {
  type: 'book' | 'review';
  id: string;
  title: string;
}

interface ReportsContextValue {
  reports: Report[];
  createReport: (target: ReportTarget, reason: string, details: string) => Promise<boolean>;
  setReportStatus: (reportId: string, status: Report['status'], adminNote?: string) => Promise<boolean>;
}

const [Provider, useReports] = createSafeContext<ReportsContextValue>('useReports');
export { useReports };

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const requireLogin = useRequireLogin();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const [reports, setReports] = useState<Report[]>([]);
  const userId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    showToastRef.current = showToast;
  });

  useEffect(() => {
    setReports([]);
    if (!userId) return;
    const reportsQuery = isAdmin
      ? firestoreRefs.reports()
      : query(firestoreRefs.reports(), where('reporterId', '==', userId));
    return onSnapshot(
      reportsQuery,
      snapshot =>
        setReports(
          snapshot.docs
            .map(reportDoc => reportDoc.data())
            .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
        ),
      error => showToastRef.current(getErrorMessage(error), 'error'),
    );
  }, [userId, isAdmin]);

  const createReport = async (target: ReportTarget, reason: string, details: string) => {
    const user = requireLogin('Iniciá sesión para denunciar contenido.');
    if (!user) return false;
    if (!reason.trim() || reason.length > 200 || details.length > 2000) {
      showToast('Revisá el motivo y los detalles de la denuncia.', 'error');
      return false;
    }

    const reportId = docIds.report(user.id, target.type, target.id);
    if (reports.some(report => report.id === reportId)) {
      showToast('Ya enviaste una denuncia sobre este contenido.', 'info');
      return false;
    }

    const reportRef = doc(firestoreRefs.reports(), reportId);
    try {
      const report: Report = {
        id: reportId,
        reporterId: user.id,
        reporterName: user.displayName,
        targetType: target.type,
        targetId: target.id,
        targetTitle: target.title,
        reason: reason.trim(),
        details: details.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await setDoc(reportRef, report);
      showToast('Denuncia enviada. Un administrador la revisará a la brevedad.', 'success');
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  const setReportStatus = async (reportId: string, status: Report['status'], adminNote?: string) => {
    if (!isAdmin || !userId || status === 'pending') return false;
    try {
      await updateDoc(doc(firestoreRefs.reports(), reportId), {
        status,
        ...(adminNote === undefined ? {} : { adminNote }),
        resolvedBy: userId,
        resolvedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
      return false;
    }
  };

  return <Provider value={{ reports, createReport, setReportStatus }}>{children}</Provider>;
};
