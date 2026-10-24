import { useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() =>
    readJSON(key, typeof initial === 'function' ? (initial as () => T)() : initial)
  );

  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
