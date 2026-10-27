import React from 'react';

import { BOOK_LANGUAGES } from '@/constants/catalog';
import { CATALOG_PARAMS, CatalogParam } from '@/constants/routes';
import { BOOK_CONDITION_LABELS, BOOK_CONDITIONS } from '@/constants/statuses';
import { CatalogFilters } from '@/features/catalog/catalogFilters';
import { formatPrice } from '@/lib/format';

interface CatalogFiltersPanelProps {
  filters: CatalogFilters;
  priceCeiling: number;
  onChange: (param: CatalogParam, value: string) => void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20';

const FORMAT_OPTIONS = [
  { value: '', label: 'Todos' },
  ...BOOK_CONDITIONS.map(value => ({ value, label: BOOK_CONDITION_LABELS[value] })),
];

export const CatalogFiltersPanel: React.FC<CatalogFiltersPanelProps> = ({ filters, priceCeiling, onChange }) => (
  <div className="space-y-6">
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-900">Formato</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {FORMAT_OPTIONS.map(option => {
          const isActive = filters.condition === option.value;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(CATALOG_PARAMS.condition, option.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 ${
                isActive
                  ? 'border-slate-900 bg-slate-900 font-semibold text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>

    <div>
      <label htmlFor="catalog-language" className="mb-2 block text-sm font-semibold text-slate-900">
        Idioma
      </label>
      <select
        id="catalog-language"
        value={filters.language}
        onChange={event => onChange(CATALOG_PARAMS.language, event.target.value)}
        className={fieldClass}
      >
        <option value="">Todos los idiomas</option>
        {BOOK_LANGUAGES.map(language => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </div>

    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-900">Precio</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Desde
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={priceCeiling}
            placeholder="0"
            value={filters.minPrice ?? ''}
            onChange={event => onChange(CATALOG_PARAMS.minPrice, event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Hasta
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={priceCeiling}
            placeholder={String(priceCeiling)}
            value={filters.maxPrice ?? ''}
            onChange={event => onChange(CATALOG_PARAMS.maxPrice, event.target.value)}
            className={`${fieldClass} mt-1`}
          />
        </label>
      </div>
      {priceCeiling > 0 && (
        <p className="mt-2 text-xs text-slate-500">El libro más caro cuesta {formatPrice(priceCeiling)}.</p>
      )}
    </fieldset>
  </div>
);
