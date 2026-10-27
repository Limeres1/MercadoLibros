import { describe, expect, it } from 'vitest';

import { toSuggestion } from '@/services/geocoding';

describe('geocoding', () => {
  it('builds a readable address from a Photon feature', () => {
    const suggestion = toSuggestion({
      geometry: { coordinates: [-58.38, -34.6] },
      properties: {
        osm_type: 'W',
        osm_id: 1,
        street: 'Avenida Corrientes',
        housenumber: '1234',
        district: 'San Nicolás',
        city: 'Buenos Aires',
        state: 'Ciudad Autónoma de Buenos Aires',
        postcode: 'C1043AAZ',
      },
    });
    expect(suggestion).toMatchObject({
      street: 'Avenida Corrientes 1234',
      label: 'Avenida Corrientes 1234, San Nicolás, Buenos Aires, Ciudad Autónoma de Buenos Aires, C1043AAZ',
      hasNumber: true,
      lat: -34.6,
      lng: -58.38,
    });
  });

  it('flags addresses without a street number', () => {
    const suggestion = toSuggestion({
      geometry: { coordinates: [0, 0] },
      properties: { osm_type: 'W', osm_id: 2, name: 'Calle Falsa', city: 'Springfield' },
    });
    expect(suggestion.hasNumber).toBe(false);
    expect(suggestion.label).toBe('Calle Falsa, Springfield');
  });
});
