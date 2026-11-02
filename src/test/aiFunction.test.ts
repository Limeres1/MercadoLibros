import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_ERRORS, isRateLimited, parseBody, POST, RATE_LIMIT } from '@api/ai';

const { generateContent, jwtVerify } = vi.hoisted(() => ({ generateContent: vi.fn(), jwtVerify: vi.fn() }));

vi.mock('jose', () => ({ createRemoteJWKSet: () => ({}), jwtVerify }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const buildRequest = (body: unknown, token = 'valid-token') =>
  new Request('http://localhost/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

describe('api/ai', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
    jwtVerify.mockResolvedValue({ payload: { sub: crypto.randomUUID() } });
    generateContent.mockResolvedValue({ text: 'respuesta' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('validates the request body', () => {
    expect(parseBody({ prompt: 'Hola' })).toEqual({ prompt: 'Hola' });
    expect(parseBody({ prompt: '   ' })).toBeNull();
    expect(parseBody({ prompt: 'Hola', json: 'yes' })).toBeNull();
    expect(parseBody(null)).toBeNull();
  });

  it('limits requests per user and window', () => {
    const now = Date.now();
    const userId = crypto.randomUUID();
    for (let attempt = 0; attempt < RATE_LIMIT.requests; attempt++) {
      expect(isRateLimited(userId, now)).toBe(false);
    }
    expect(isRateLimited(userId, now)).toBe(true);
    expect(isRateLimited(userId, now + RATE_LIMIT.windowMs)).toBe(false);
  });

  it('returns 503 when the key is not configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await POST(buildRequest({ prompt: 'Hola' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: AI_ERRORS.notConfigured });
  });

  it('rejects requests without a valid Firebase token', async () => {
    jwtVerify.mockRejectedValue(new Error('invalid'));
    const response = await POST(buildRequest({ prompt: 'Hola' }));
    expect(response.status).toBe(401);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns the Gemini text for a logged in user', async () => {
    const response = await POST(buildRequest({ prompt: 'Hola', json: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: 'respuesta' });
    expect(generateContent.mock.calls[0][0].model).toBe('gemini-3.6-flash');
    expect(generateContent.mock.calls[0][0].config.responseMimeType).toBe('application/json');
    expect(generateContent.mock.calls[0][0].config.maxOutputTokens).toBeUndefined();
  });

  it('falls back to the next models when Gemini is overloaded, missing or out of quota', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    generateContent.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));
    generateContent.mockRejectedValueOnce(Object.assign(new Error('gateway timeout'), { status: 504 }));
    const response = await POST(buildRequest({ prompt: 'Hola' }));
    expect(await response.json()).toEqual({ text: 'respuesta' });
    expect(generateContent.mock.calls.map(([request]) => request.model)).toEqual([
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ]);
  });

  it('stops trying other models when the time budget is spent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.useFakeTimers({ toFake: ['Date'] });
    generateContent.mockImplementationOnce(async () => {
      vi.setSystemTime(Date.now() + 18_000);
      throw Object.assign(new Error('timeout'), { status: 504 });
    });
    const response = await POST(buildRequest({ prompt: 'Hola' }));
    vi.useRealTimers();
    expect(response.status).toBe(502);
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent.mock.calls[0][0].config.httpOptions.timeout).toBe(12_000);
  });

  it('returns a clear error when Gemini fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    generateContent.mockRejectedValue(new Error('quota'));
    const response = await POST(buildRequest({ prompt: 'Hola' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: AI_ERRORS.unavailable });
  });
});
