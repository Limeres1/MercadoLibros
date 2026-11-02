import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { AuditLogView } from '@/features/admin/AuditLogView';
import { BooksAdmin } from '@/features/admin/BooksAdmin';
import { ReportsQueue } from '@/features/admin/ReportsQueue';
import { ReviewQueue } from '@/features/admin/ReviewQueue';
import { UsersAdmin } from '@/features/admin/UsersAdmin';
import { useSession } from '@/features/auth/SessionProvider';
import { useBooks } from '@/features/catalog/BooksProvider';
import { useReports } from '@/features/catalog/reports/ReportsProvider';

const ADMIN_TABS = {
  review: 'Revisión',
  reports: 'Denuncias',
  books: 'Libros',
  users: 'Usuarios',
  audit: 'Registro',
} as const;

type AdminTab = keyof typeof ADMIN_TABS;

export const AdminDashboard: React.FC = () => {
  const { users } = useSession();
  const { managedBooks: books } = useBooks();
  const { reports } = useReports();
  const [activeTab, setActiveTab] = useState<AdminTab>('review');

  const pendingBooks = books
    .filter(book => book.status === 'pending_review')
    .sort((first, second) => first.updatedAt.localeCompare(second.updatedAt));
  const counters: Partial<Record<AdminTab, number>> = {
    review: pendingBooks.length,
    reports: reports.filter(report => report.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="rounded-xl bg-red-100 p-2 text-red-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            Administración
          </h1>
          <p className="mt-1 text-xs text-slate-500">Publicaciones, denuncias, usuarios y registro de auditoría.</p>
        </div>

        <div
          role="tablist"
          aria-label="Secciones"
          className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold"
        >
          {(Object.keys(ADMIN_TABS) as AdminTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className="rounded-xl px-3 py-1.5 text-slate-500 transition-colors hover:text-slate-900 aria-selected:bg-white aria-selected:text-slate-900 aria-selected:shadow-2xs"
            >
              {ADMIN_TABS[tab]}
              {Boolean(counters[tab]) && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-[10px] text-white ${tab === 'reports' ? 'bg-red-500' : 'bg-amber-500'}`}
                >
                  {counters[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" aria-label={ADMIN_TABS[activeTab]}>
        {activeTab === 'review' && <ReviewQueue books={pendingBooks} />}
        {activeTab === 'reports' && <ReportsQueue reports={reports} />}
        {activeTab === 'books' && <BooksAdmin books={books} />}
        {activeTab === 'users' && <UsersAdmin users={users} />}
        {activeTab === 'audit' && <AuditLogView />}
      </div>
    </div>
  );
};
