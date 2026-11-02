import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
    <Icon className="w-12 h-12 text-slate-300 mx-auto mb-2" aria-hidden="true" />
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    {description && <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);
