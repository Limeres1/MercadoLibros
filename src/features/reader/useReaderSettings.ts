import { useEffect, useState } from 'react';

import { READER_FONT_SIZE } from '@/constants/reader';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readJSON, writeJSON } from '@/lib/storage';
import { ReaderSettings } from '@/types';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: READER_FONT_SIZE.default,
  theme: 'sepia',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
};

function normalizeSettings(value: unknown): ReaderSettings {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<ReaderSettings>) : {};
  const size = saved.fontSize;
  const fontSize =
    typeof size === 'number' && Number.isFinite(size)
      ? Math.min(
          READER_FONT_SIZE.max,
          Math.max(READER_FONT_SIZE.min, Math.round(size / READER_FONT_SIZE.step) * READER_FONT_SIZE.step),
        )
      : READER_FONT_SIZE.default;
  return { ...DEFAULT_SETTINGS, ...saved, fontSize };
}

export function useReaderSettings() {
  const [readerSettings, setReaderSettings] = useState(() =>
    normalizeSettings(readJSON<unknown>(STORAGE_KEYS.readerSettings, DEFAULT_SETTINGS)),
  );

  useEffect(() => {
    writeJSON(STORAGE_KEYS.readerSettings, readerSettings);
  }, [readerSettings]);

  const updateReaderSettings = (settings: Partial<ReaderSettings>) =>
    setReaderSettings(prev => normalizeSettings({ ...prev, ...settings }));

  return { readerSettings, updateReaderSettings };
}
