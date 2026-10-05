import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const bgClasses = {
    success: 'bg-emerald-900/90 text-white border-emerald-700/50',
    error: 'bg-rose-900/90 text-white border-rose-700/50',
    info: 'bg-slate-900/90 text-white border-slate-700/50'
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[toast.type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-semibold max-w-md ${bgClasses}`}>
        <Icon className="w-4 h-4 shrink-0 text-amber-300" />
        <span className="flex-1">{toast.message}</span>
      </div>
    </div>
  );
};
