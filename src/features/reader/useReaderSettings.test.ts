import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useReaderSettings } from '@/features/reader/useReaderSettings';

describe('reader font size persistence', () => {
  it.each([
    [null, 18],
    [[], 18],
    ['invalid', 18],
    [{ fontSize: 'large' }, 18],
    [{ fontSize: null }, 18],
    [{ fontSize: -50 }, 14],
    [{ fontSize: 1000 }, 26],
    [{ fontSize: 19.2 }, 20],
    [{ fontSize: 22, theme: 'dark' }, 22],
  ])('recovers a usable size from saved settings %j', (saved, expected) => {
    localStorage.setItem(STORAGE_KEYS.readerSettings, JSON.stringify(saved));
    const { result } = renderHook(() => useReaderSettings());
    expect(result.current.readerSettings.fontSize).toBe(expected);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.readerSettings)!)).toHaveProperty('fontSize', expected);
  });

  it('recovers from malformed JSON', () => {
    localStorage.setItem(STORAGE_KEYS.readerSettings, '{broken');
    const { result } = renderHook(() => useReaderSettings());
    expect(result.current.readerSettings.fontSize).toBe(18);
  });

  it('normalizes updates and restores the size after remounting without losing other preferences', () => {
    const first = renderHook(() => useReaderSettings());
    act(() => first.result.current.updateReaderSettings({ theme: 'dark', fontSize: 24 }));
    first.unmount();
    const second = renderHook(() => useReaderSettings());
    expect(second.result.current.readerSettings).toMatchObject({ fontSize: 24, theme: 'dark' });
    act(() => second.result.current.updateReaderSettings({ fontSize: Infinity }));
    expect(second.result.current.readerSettings.fontSize).toBe(18);
    expect(second.result.current.readerSettings.theme).toBe('dark');
  });

  it('keeps controls usable if browser storage cannot be written', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    try {
      const { result } = renderHook(() => useReaderSettings());
      act(() => result.current.updateReaderSettings({ fontSize: 22 }));
      expect(result.current.readerSettings.fontSize).toBe(22);
    } finally {
      storageWrite.mockRestore();
    }
  });
});
