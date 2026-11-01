import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { BOOK_KEYWORD_LIMITS } from '@/constants/catalog';
import { mergeKeywords } from '@/features/seller/aiBookProposal';

interface KeywordsFieldProps {
  id: string;
  keywords: string[];
  onChange: (keywords: string[]) => void;
  inputClassName: string;
}

export const KeywordsField: React.FC<KeywordsFieldProps> = ({ id, keywords, onChange, inputClassName }) => {
  const [draft, setDraft] = useState('');
  const isFull = keywords.length >= BOOK_KEYWORD_LIMITS.maxCount;

  const addDraft = () => {
    const next = mergeKeywords(keywords, draft.split(','));
    if (next.length !== keywords.length) onChange(next);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      {keywords.length > 0 && (
        <ul aria-label="Palabras clave cargadas" className="flex flex-wrap gap-1.5">
          {keywords.map(keyword => (
            <li
              key={keyword}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-700"
            >
              {keyword}
              <button
                type="button"
                onClick={() => onChange(keywords.filter(current => current !== keyword))}
                aria-label={`Quitar ${keyword}`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          disabled={isFull}
          maxLength={BOOK_KEYWORD_LIMITS.maxLength * 2}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            addDraft();
          }}
          placeholder={isFull ? `Máximo ${BOOK_KEYWORD_LIMITS.maxCount} palabras clave` : 'Ej.: misterio, buenos aires'}
          className={`${inputClassName} flex-1 disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={isFull || !draft.trim()}
          className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Agregar
        </button>
      </div>
    </div>
  );
};
