import { ComponentType, lazy } from 'react';

export function lazyPage<M extends Record<string, unknown>, K extends keyof M>(loader: () => Promise<M>, name: K) {
  return lazy(() => loader().then(module => ({ default: module[name] as ComponentType })));
}
