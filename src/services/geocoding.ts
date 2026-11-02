import { GEOCODER_URL, SOUTH_AMERICA_BBOX } from '@/constants/geo';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressSuggestion extends GeoPoint {
  id: string;
  street: string;
  area: string;
  label: string;
  hasNumber: boolean;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | number | undefined>;
}

const unique = (parts: (string | number | undefined)[]) => [
  ...new Set(parts.filter((part): part is string | number => Boolean(part)).map(String)),
];

export function toSuggestion(feature: PhotonFeature): AddressSuggestion {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const street = unique([props.street ?? props.name, props.housenumber]).join(' ');
  const area = unique([props.district ?? props.locality, props.city, props.state, props.postcode]).join(', ');
  return {
    id: `${props.osm_type}${props.osm_id}`,
    street,
    area,
    label: [street, area].filter(Boolean).join(', '),
    hasNumber: Boolean(props.housenumber),
    lat,
    lng,
  };
}

async function requestFeatures(path: string, params: string[][], signal?: AbortSignal) {
  const response = await fetch(`${GEOCODER_URL}${path}?${new URLSearchParams(params)}`, { signal });
  if (!response.ok) throw new Error(`Geocoder ${response.status}`);
  const data: { features: PhotonFeature[] } = await response.json();
  const suggestions = data.features.map(toSuggestion).filter(suggestion => suggestion.street);
  return [...new Map(suggestions.map(suggestion => [suggestion.label, suggestion])).values()];
}

export const searchAddresses = (text: string, near: GeoPoint, signal?: AbortSignal) =>
  requestFeatures(
    '/api/',
    [
      ['q', text],
      ['lang', 'default'],
      ['lat', String(near.lat)],
      ['lon', String(near.lng)],
      ['limit', '6'],
      ['bbox', SOUTH_AMERICA_BBOX],
      ['layer', 'house'],
      ['layer', 'street'],
    ],
    signal,
  );

export const reverseGeocode = async (point: GeoPoint) =>
  (
    await requestFeatures('/reverse', [
      ['lat', String(point.lat)],
      ['lang', 'default'],
      ['lon', String(point.lng)],
      ['limit', '1'],
    ])
  )[0] ?? null;
