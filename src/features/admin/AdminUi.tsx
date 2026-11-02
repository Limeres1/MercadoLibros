import React from 'react';
import { Search } from 'lucide-react';

export const PANEL_CLASS = 'overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xs';

export const PanelHeader: React.FC<{ title: string; description: string; children?: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5">
    <div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    {children}
  </div>
);

interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({ label, value, onChange, placeholder }) => (
  <label className="relative block min-w-0 flex-1 sm:w-72 sm:flex-none">
    <span className="sr-only">{label}</span>
    <Search
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    />
    <input
      type="search"
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-500 focus:bg-white"
    />
  </label>
);

export const SELECT_CLASS =
  'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-500 focus:bg-white';

export const EmptyRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="p-10 text-center text-xs text-slate-500">{children}</p>
);
