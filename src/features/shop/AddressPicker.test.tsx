import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADDRESS_SEARCH_DELAY_MS } from '@/constants/geo';
import { AddressPicker, ShippingAddress } from '@/features/shop/AddressPicker';
import { AddressSuggestion } from '@/services/geocoding';

const suggestion = (street: string, hasNumber = true): AddressSuggestion => ({
  id: street,
  street,
  area: 'Belgrano, Buenos Aires',
  label: `${street}, Belgrano, Buenos Aires`,
  hasNumber,
  lat: -34.56,
  lng: -58.45,
});

const geocoding = vi.hoisted(() => ({
  searchAddresses: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock('@/services/geocoding', () => geocoding);
vi.mock('@/features/shop/AddressMap', () => ({ default: () => <div data-testid="address-map" /> }));

let latest: ShippingAddress;
const Harness: React.FC = () => {
  const [address, setAddress] = useState<ShippingAddress>({ street: '', details: '', location: null });
  latest = address;
  return <AddressPicker value={address} onChange={setAddress} />;
};

const input = () => screen.getByRole('combobox');
const typeAddress = async (text: string) => {
  fireEvent.focus(input());
  input().focus();
  fireEvent.change(input(), { target: { value: text } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ADDRESS_SEARCH_DELAY_MS + 10);
  });
};

describe('AddressPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    geocoding.searchAddresses.mockResolvedValue([suggestion('Echeverría 3292'), suggestion('Echeverría 3300')]);
    geocoding.reverseGeocode.mockResolvedValue(suggestion('Conde 1900'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows suggestions and closes them after picking one, then shows the map', async () => {
    render(<Harness />);
    await typeAddress('Echeverría 32');
    expect(screen.getAllByRole('option')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveValue('Echeverría 3292, Belgrano, Buenos Aires');
    expect(latest.location).toEqual({ lat: -34.56, lng: -58.45 });
    expect(await screen.findByTestId('address-map')).toBeInTheDocument();
    expect(geocoding.searchAddresses).toHaveBeenCalledTimes(1);
  });

  it('closes the list and fills the address when using the current location', async () => {
    let reportPosition: (position: unknown) => void = () => undefined;
    const getCurrentPosition = vi.fn(success => (reportPosition = success));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(<Harness />);
    await typeAddress('Echeverría 32');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await act(async () => reportPosition({ coords: { latitude: -34.57, longitude: -58.44 } }));
    expect(input()).toHaveValue('Conde 1900, Belgrano, Buenos Aires');
    expect(latest.location).toEqual({ lat: -34.57, lng: -58.44 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADDRESS_SEARCH_DELAY_MS * 3);
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('does not reopen the list when results arrive after the field lost focus', async () => {
    let resolveSearch: (results: AddressSuggestion[]) => void = () => undefined;
    geocoding.searchAddresses.mockReturnValue(new Promise(resolve => (resolveSearch = resolve)));
    render(<Harness />);
    await typeAddress('Echeverría 32');
    fireEvent.blur(input());
    input().blur();
    await act(async () => resolveSearch([suggestion('Echeverría 3292')]));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the list with Escape and picks with the keyboard', async () => {
    render(<Harness />);
    await typeAddress('Echeverría 32');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await typeAddress('Echeverría 33');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(input()).toHaveValue('Echeverría 3300, Belgrano, Buenos Aires');
  });

  it('drops the map when the address is edited by hand and warns about a missing number', async () => {
    geocoding.searchAddresses.mockResolvedValue([suggestion('Calle sin número', false)]);
    render(<Harness />);
    await typeAddress('Calle sin');
    fireEvent.click(screen.getByRole('option'));
    expect(screen.getByText(/agregá la altura/i)).toBeInTheDocument();

    await typeAddress('Otra calle 12');
    expect(latest.location).toBeNull();
    expect(screen.queryByTestId('address-map')).not.toBeInTheDocument();
  });

  it('explains when the location permission is denied', async () => {
    const getCurrentPosition = vi.fn((_success, failure) => failure(new Error('denied')));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    render(<Harness />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /usar mi ubicación/i }));
    });
    expect(screen.getByText(/no pudimos obtener tu ubicación/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
