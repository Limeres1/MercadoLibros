const PREFIX = 'mercadolibros_v2_';

export const STORAGE_KEYS = {
  reports: `${PREFIX}reports`,
  favorites: `${PREFIX}favorites`,
  readerSettings: `${PREFIX}reader`,
  sessionHint: `${PREFIX}session_hint`,
} as const;
