import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAI } from '@/hooks/useAI';
import { AI_CLIENT_ERRORS } from '@/services/ai';

const { getIdToken } = vi.hoisted(() => ({ getIdToken: vi.fn() }));

vi.mock('@/services/firebase', () => ({ auth: { currentUser: { getIdToken } } }));

describe('useAI', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns the text and clears the loading state', async () => {
    getIdToken.mockResolvedValue('token');
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ text: 'Resumen' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAI());

    let answer: string | null = null;
    await act(async () => {
      answer = await result.current.ask({ prompt: 'Resumí' });
    });

    expect(answer).toBe('Resumen');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  });

  it('shows the server message when the request fails', async () => {
    getIdToken.mockResolvedValue('token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Esperá un minuto' }, { status: 429 })));
    const { result } = renderHook(() => useAI());

    await act(async () => {
      expect(await result.current.ask({ prompt: 'Resumí' })).toBeNull();
    });

    expect(result.current.error).toBe('Esperá un minuto');
  });

  it('asks to log in when there is no Firebase user token', async () => {
    getIdToken.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.ask({ prompt: 'Resumí' });
    });

    expect(result.current.error).toBe(AI_CLIENT_ERRORS.notLoggedIn);
  });

  it('shows a network message when fetch fails', async () => {
    getIdToken.mockResolvedValue('token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useAI());

    await act(async () => {
      await result.current.ask({ prompt: 'Resumí' });
    });

    expect(result.current.error).toBe(AI_CLIENT_ERRORS.network);
  });
});
