import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldAlert, AlertTriangle, Send } from 'lucide-react';

export const ReportModal: React.FC = () => {
  const { 
    isReportModalOpen, 
    setIsReportModalOpen, 
    reportTarget, 
    createReport 
  } = useApp();

  const [reason, setReason] = useState('Contenido inapropiado o engañoso');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReportModalOpen || !reportTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await createReport(reason, details.trim() || 'Sin detalles adicionales');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-red-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Enviar Denuncia (RF-25)</h3>
              <p className="text-xs text-slate-500">
                Denunciando {reportTarget.type === 'book' ? 'Libro' : 'Reseña'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReportModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Elemento denunciado:</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{reportTarget.title}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Motivo principal de la denuncia *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 text-slate-800"
            >
              <option value="Contenido inapropiado o violento">Contenido inapropiado o violento</option>
              <option value="Información o precio engañoso">Información o precio engañoso</option>
              <option value="Plagio o violación de derechos de autor">Plagio o violación de derechos de autor</option>
              <option value="Spam o publicidad encubierta">Spam o publicidad encubierta</option>
              <option value="Lenguaje ofensivo o acoso">Lenguaje ofensivo o acoso</option>
              <option value="Otro motivo">Otro motivo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Detalles o justificación (opcional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explica detalladamente por qué este contenido incumple las normas de la comunidad..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500 resize-none text-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Denuncia (RF-25)</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
