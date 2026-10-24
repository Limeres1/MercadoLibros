import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

import { createSafeContext } from '@/lib/createSafeContext';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const [Provider, useToast] = createSafeContext<ToastContextValue>('useToast');
export { useToast };

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-900/90 text-white border-emerald-700/50',
  error: 'bg-rose-900/90 text-white border-rose-700/50',
  info: 'bg-slate-900/90 text-white border-slate-700/50',
};

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId.current;
    setToast({ id, message, type });
    setTimeout(() => setToast(prev => (prev?.id === id ? null : prev)), 4000);
  }, []);

  const Icon = toast ? ICONS[toast.type] : null;

  return (
    <Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 z-[60] flex justify-center"
      >
        {toast && Icon && (
          <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md text-xs font-semibold max-w-md animate-in fade-in slide-in-from-bottom-5 duration-200 ${STYLES[toast.type]}`}
          >
            <Icon className="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span className="flex-1">{toast.message}</span>
          </div>
        )}
      </div>
    </Provider>
  );
};
