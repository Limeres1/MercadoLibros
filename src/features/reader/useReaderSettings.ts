import { ReaderSettings } from '../../types';
import { usePersistentState } from '../../hooks/usePersistentState';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  theme: 'sepia',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
};

export function useReaderSettings() {
  const [readerSettings, setReaderSettings] = usePersistentState<ReaderSettings>(STORAGE_KEYS.readerSettings, DEFAULT_SETTINGS);

  const updateReaderSettings = (settings: Partial<ReaderSettings>) =>
    setReaderSettings(prev => ({ ...prev, ...settings }));

  return { readerSettings, updateReaderSettings };
}
