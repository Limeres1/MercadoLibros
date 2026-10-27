import React, { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';

import { ADDRESS_SEARCH_DELAY_MS, ADDRESS_SEARCH_MIN_LENGTH, DEFAULT_SEARCH_CENTER } from '@/constants/geo';
import { AddressSuggestion, GeoPoint, reverseGeocode, searchAddresses } from '@/services/geocoding';

const AddressMap = lazy(() => import('@/features/shop/AddressMap'));

export interface ShippingAddress {
  street: string;
  details: string;
  location: GeoPoint | null;
}

export const formatShippingAddress = (address: ShippingAddress) =>
  [address.street.trim(), address.details.trim()].filter(Boolean).join(' · ');

interface AddressPickerProps {
  value: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
}

const MISSING_NUMBER_HINT = 'Agregá la altura (número de puerta) para que el envío llegue bien.';

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20';

export const AddressPicker: React.FC<AddressPickerProps> = ({ value, onChange }) => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const locateRequestRef = useRef(0);
  const lastLocationRef = useRef<GeoPoint>(value.location ?? DEFAULT_SEARCH_CENTER);
  const [inputText, setInputText] = useState(value.street);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
  });

  const update = (changes: Partial<ShippingAddress>) => {
    const next = { ...valueRef.current, ...changes };
    if (next.location) lastLocationRef.current = next.location;
    valueRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    const text = searchText.trim();
    if (text.length < ADDRESS_SEARCH_MIN_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      searchAddresses(text, valueRef.current.location ?? lastLocationRef.current, controller.signal)
        .then(results => {
          setSuggestions(results);
          setActiveIndex(-1);
          setIsOpen(document.activeElement === inputRef.current);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setIsSearching(false));
    }, ADDRESS_SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchText]);

  const closeSuggestions = () => {
    setSearchText('');
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const showAddress = (suggestion: AddressSuggestion, location: GeoPoint, missingNumberHint: string) => {
    closeSuggestions();
    setInputText(suggestion.label);
    setHint(suggestion.hasNumber ? null : missingNumberHint);
    update({ street: suggestion.label, location });
  };

  const applySuggestion = (suggestion: AddressSuggestion) =>
    showAddress(suggestion, { lat: suggestion.lat, lng: suggestion.lng }, MISSING_NUMBER_HINT);

  const moveTo = async (point: GeoPoint) => {
    const request = ++locateRequestRef.current;
    closeSuggestions();
    update({ location: point });
    const found = await reverseGeocode(point).catch(() => null);
    if (request !== locateRequestRef.current) return;
    if (found) {
      showAddress(found, point, 'Revisá la altura: el punto del mapa no coincide con un número de puerta.');
    } else {
      setHint('No encontramos una dirección en ese punto. Escribila a mano.');
    }
  };

  const useMyLocation = () => {
    closeSuggestions();
    if (!navigator.geolocation) {
      setHint('Tu navegador no permite usar la ubicación.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setIsLocating(false);
        moveTo({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setIsLocating(false);
        setHint('No pudimos obtener tu ubicación. Revisá el permiso del navegador o escribí la dirección.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleTyping = (text: string) => {
    locateRequestRef.current += 1;
    setInputText(text);
    setSearchText(text);
    setHint(null);
    update({ street: text, location: null });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      applySuggestion(suggestions[activeIndex]);
    }
  };

  const isListVisible = isOpen && suggestions.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative z-30">
        <div className="flex items-center justify-between">
          <label htmlFor={`${listId}-input`} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Dirección de envío
          </label>
          <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={useMyLocation}
            disabled={isLocating}
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Usar mi ubicación
          </button>
        </div>
        <div className="relative mt-1">
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={isListVisible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={isListVisible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            required
            minLength={8}
            value={inputText}
            onChange={event => handleTyping(event.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onKeyDown={handleKeyDown}
            placeholder="Empezá a escribir: calle y número, ciudad"
            className={`${fieldClass} pr-9`}
          />
          {(isSearching || isLocating) && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
          )}
        </div>
        {isListVisible && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.label}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={event => event.preventDefault()}
                onClick={() => applySuggestion(suggestion)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
              >
                <span className="block font-medium text-slate-900">{suggestion.street}</span>
                <span className="block text-xs text-slate-500">{suggestion.area}</span>
              </li>
            ))}
          </ul>
        )}
        {hint && <p className="mt-1 text-xs text-amber-800">{hint}</p>}
      </div>

      {value.location && (
        <div className="relative isolate z-0 space-y-1">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-100" />}>
            <AddressMap point={value.location} onMove={moveTo} />
          </Suspense>
          <p className="text-xs text-slate-500">Si el punto no es exacto, arrastrá el marcador o tocá el mapa.</p>
        </div>
      )}

      <div>
        <label htmlFor={`${listId}-details`} className="text-sm font-semibold text-slate-900">
          Piso, depto. o indicaciones <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <input
          id={`${listId}-details`}
          type="text"
          maxLength={120}
          value={value.details}
          onChange={event => update({ details: event.target.value })}
          placeholder="Ej.: 3° B, timbre roto"
          className={`${fieldClass} mt-1`}
        />
      </div>
    </div>
  );
};
