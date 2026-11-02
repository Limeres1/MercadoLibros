import { createContext, useContext } from 'react';

export function createSafeContext<T>(name: string) {
  const Context = createContext<T | undefined>(undefined);

  const useSafeContext = () => {
    const value = useContext(Context);
    if (value === undefined) {
      throw new Error(`${name} debe usarse dentro de su Provider`);
    }
    return value;
  };

  return [Context.Provider, useSafeContext] as const;
}
