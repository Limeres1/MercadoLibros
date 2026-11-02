import React, { useId } from 'react';
import { Check, Sparkles, X } from 'lucide-react';

import { BOOK_GENRES } from '@/constants/catalog';
import { AIBookProposal } from '@/features/seller/aiBookProposal';
import { KeywordsField } from '@/features/seller/KeywordsField';

interface AIProposalPanelProps {
  proposal: AIBookProposal;
  replacesDescription: boolean;
  onChange: (proposal: AIBookProposal) => void;
  onApply: () => void;
  onDiscard: () => void;
}

const PANEL_INPUT_CLASS =
  'w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-500';
const PANEL_LABEL_CLASS = 'text-[11px] font-semibold text-indigo-950 block mb-1';

export const AIProposalPanel: React.FC<AIProposalPanelProps> = ({
  proposal,
  replacesDescription,
  onChange,
  onApply,
  onDiscard,
}) => {
  const fieldId = useId();

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 id={`${fieldId}-title`} className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
            Propuesta de la IA
          </h5>
          <p className="mt-0.5 text-[11px] text-indigo-800">
            Todavía no está en tu ficha. Revisala, cambiá lo que quieras y tocá «Usar propuesta».
          </p>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          aria-label="Descartar propuesta"
          className="rounded-lg p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div>
        <label htmlFor={`${fieldId}-description`} className={PANEL_LABEL_CLASS}>
          Sinopsis propuesta
        </label>
        <textarea
          id={`${fieldId}-description`}
          rows={6}
          maxLength={5000}
          value={proposal.description}
          onChange={event => onChange({ ...proposal, description: event.target.value })}
          className={`${PANEL_INPUT_CLASS} resize-y`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
        <div>
          <label htmlFor={`${fieldId}-genre`} className={PANEL_LABEL_CLASS}>
            Género propuesto
          </label>
          <select
            id={`${fieldId}-genre`}
            value={proposal.genre}
            onChange={event => onChange({ ...proposal, genre: event.target.value })}
            className={PANEL_INPUT_CLASS}
          >
            {[...new Set<string>([...BOOK_GENRES, proposal.genre])].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldId}-keywords`} className={PANEL_LABEL_CLASS}>
            Palabras clave propuestas
          </label>
          <KeywordsField
            id={`${fieldId}-keywords`}
            listLabel="Palabras clave de la propuesta"
            keywords={proposal.keywords}
            onChange={keywords => onChange({ ...proposal, keywords })}
            inputClassName={PANEL_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {replacesDescription && (
          <p className="mr-auto text-[11px] text-indigo-800">Reemplaza la sinopsis que ya escribiste.</p>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-indigo-100"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!proposal.description.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Usar propuesta
        </button>
      </div>
    </section>
  );
};
