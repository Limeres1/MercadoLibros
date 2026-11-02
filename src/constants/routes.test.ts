import { describe, expect, it } from 'vitest';

import { CATALOG_PARAMS, paths, ROUTES } from '@/constants/routes';

describe('paths', () => {
  it('builds book and reader paths from the route patterns', () => {
    expect(paths.book('book_1')).toBe('/libro/book_1');
    expect(paths.reader('book_1')).toBe('/leer/book_1');
  });

  it('builds the catalog search url and falls back to home', () => {
    expect(paths.home('el aleph')).toBe('/?q=el+aleph');
    expect(paths.home()).toBe(ROUTES.home);
  });

  it('builds catalog urls with filters', () => {
    expect(paths.catalog({ [CATALOG_PARAMS.genre]: 'Realismo Mágico' })).toBe('/?genero=Realismo+M%C3%A1gico');
    expect(paths.catalog({})).toBe(ROUTES.home);
  });
});
