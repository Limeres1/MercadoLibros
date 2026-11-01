import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCatalogPrompt, CatalogEntry, parseRecommendations } from '@api/_lib/recommendations';
import { POST, RECOMMENDATION_ERRORS } from '@api/recommendations';

const fake = vi.hoisted(() => ({
  generateContent: vi.fn(),
  verifyRequestUser: vi.fn(),
  catalogQueries: 0,
  docs: [] as { id: string; data: Record<string, string> }[],
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: fake.generateContent };
  },
}));
vi.mock('@api/_lib/firebaseAdmin', () => ({
  verifyRequestUser: fake.verifyRequestUser,
  adminDb: () => ({
    collection: () => ({
      where: () => ({
        select: () => ({
          get: async () => {
            fake.catalogQueries += 1;
            return { docs: fake.docs.map(doc => ({ id: doc.id, get: (field: string) => doc.data[field] })) };
          },
        }),
      }),
    }),
  }),
}));

const entry = (id: string, title: string): CatalogEntry => ({
  id,
  title,
  author: 'Autora',
  genre: 'Novela',
  language: 'Español',
  condition: 'digital',
});

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });

describe('recommendation helpers', () => {
  it('sends the whole catalog in one compact line per book', () => {
    const catalog = Array.from({ length: 470 }, (_slot, index) => entry(`book_${index}`, `Título ${index}`));
    const prompt = buildCatalogPrompt('algo lindo para el verano', catalog);
    expect(prompt).toContain('Pedido del lector: algo lindo para el verano');
    expect(prompt.split('\n').filter(line => line.startsWith('book_'))).toHaveLength(470);
    expect(prompt).toContain('book_469 | Título 469 | Autora | Novela | Español | digital');
  });

  it('CA-1: keeps only existing published ids, without duplicates and up to 3', () => {
    const text = JSON.stringify({
      recommendations: [
        { bookId: 'book_1', reason: 'Encaja' },
        { bookId: 'inventado', reason: 'No existe' },
        { bookId: 'book_1', reason: 'Repetido' },
        { bookId: 'book_2', reason: ' ' },
        { bookId: 'book_3', reason: 'Otro' },
        { bookId: 'book_4', reason: 'Más' },
        { bookId: 'book_5', reason: 'Sobra' },
      ],
    });
    const result = parseRecommendations(text, new Set(['book_1', 'book_2', 'book_3', 'book_4', 'book_5']));
    expect(result.map(item => item.bookId)).toEqual(['book_1', 'book_3', 'book_4']);
  });

  it('returns no recommendations for invalid JSON instead of failing', () => {
    expect(parseRecommendations('{"recommendations": [', new Set(['book_1']))).toEqual([]);
  });
});

describe('api/recommendations', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'key');
    fake.verifyRequestUser.mockResolvedValue(crypto.randomUUID());
    fake.docs = [
      {
        id: 'book_1',
        data: { title: 'Rayuela', author: 'Julio Cortázar', genre: 'Novela', language: 'Español', condition: 'nuevo' },
      },
      {
        id: 'book_2',
        data: { title: 'Ficciones', author: 'Borges', genre: 'Cuentos', language: 'Español', condition: 'digital' },
      },
    ];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('asks the user to log in', async () => {
    fake.verifyRequestUser.mockResolvedValue(null);
    const response = await POST(buildRequest({ request: 'misterio' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: RECOMMENDATION_ERRORS.unauthorized });
  });

  it('validates the request length', async () => {
    expect((await POST(buildRequest({ request: 'no' }))).status).toBe(400);
  });

  it('returns validated recommendations from Gemini', async () => {
    fake.generateContent.mockResolvedValue({
      text: JSON.stringify({
        recommendations: [
          { bookId: 'book_2', reason: 'Cuentos breves' },
          { bookId: 'x', reason: 'y' },
        ],
      }),
    });
    const response = await POST(buildRequest({ request: 'cuentos cortos' }));
    expect(await response.json()).toEqual({ recommendations: [{ bookId: 'book_2', reason: 'Cuentos breves' }] });
    expect(fake.generateContent.mock.calls[0][0].contents).toContain('book_1 | Rayuela | Julio Cortázar');
  });

  it('CA-2: answers with a clear message when the AI is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fake.generateContent.mockRejectedValue(Object.assign(new Error('down'), { status: 503 }));
    const response = await POST(buildRequest({ request: 'cuentos cortos' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: RECOMMENDATION_ERRORS.unavailable });
  });
});
