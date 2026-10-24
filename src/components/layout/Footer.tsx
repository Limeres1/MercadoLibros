import React from 'react';
import { BookOpen } from 'lucide-react';

export const Footer: React.FC = () => (
  <footer className="bg-white border-t border-slate-200/80 py-10 mt-16 text-slate-600 text-xs">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">Mercado Libros</p>
          <p className="text-[11px] text-slate-500">Comprá, vendé y leé libros digitales en un solo lugar</p>
        </div>
      </div>
      <p className="text-slate-500 text-[11px] text-center">
        Proyecto académico · Plataformas de Desarrollo · © {new Date().getFullYear()}
      </p>
    </div>
  </footer>
);
