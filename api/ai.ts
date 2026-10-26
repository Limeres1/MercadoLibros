import { GoogleGenAI } from '@google/genai';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.6-flash';
const RETRYABLE_STATUSES = [429, 500, 503];
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIREBASE_ISSUER = 'https://securetoken.google.com/';
const MAX_PROMPT_LENGTH = 8000;
const MAX_SYSTEM_LENGTH = 2000;
export const RATE_LIMIT = { requests: 10, windowMs: 60_000 };

export const AI_ERRORS = {
  unauthorized: 'Iniciá sesión para usar las funciones de IA.',
  invalidRequest: 'La consulta a la IA no es válida.',
  rateLimited: 'Hiciste demasiadas consultas a la IA. Esperá un minuto e intentá de nuevo.',
  notConfigured: 'La IA no está configurada en este entorno.',
  unavailable: 'La IA no está disponible en este momento. Intentá más tarde.',
};

interface AIRequestBody {
  prompt: string;
  systemInstruction?: string;
  json?: boolean;
}

const firebaseKeys = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
const requestLog = new Map<string, number[]>();

const jsonResponse = (body: object, status = 200) => Response.json(body, { status });

export async function verifyUser(authorization: string | null, projectId: string): Promise<string | null> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, firebaseKeys, {
      issuer: `${FIREBASE_ISSUER}${projectId}`,
      audience: projectId,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function isRateLimited(userId: string, now = Date.now()): boolean {
  const recent = (requestLog.get(userId) ?? []).filter(timestamp => now - timestamp < RATE_LIMIT.windowMs);
  const limited = recent.length >= RATE_LIMIT.requests;
  requestLog.set(userId, limited ? recent : [...recent, now]);
  return limited;
}

export function parseBody(body: unknown): AIRequestBody | null {
  if (!body || typeof body !== 'object') return null;
  const { prompt, systemInstruction, json } = body as Record<string, unknown>;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) return null;
  if (
    systemInstruction !== undefined &&
    (typeof systemInstruction !== 'string' || systemInstruction.length > MAX_SYSTEM_LENGTH)
  ) {
    return null;
  }
  if (json !== undefined && typeof json !== 'boolean') return null;
  return { prompt, systemInstruction, json };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return jsonResponse({ error: AI_ERRORS.notConfigured }, 503);

  const userId = await verifyUser(request.headers.get('authorization'), projectId);
  if (!userId) return jsonResponse({ error: AI_ERRORS.unauthorized }, 401);
  if (isRateLimited(userId)) return jsonResponse({ error: AI_ERRORS.rateLimited }, 429);

  const body = parseBody(await request.json().catch(() => null));
  if (!body) return jsonResponse({ error: AI_ERRORS.invalidRequest }, 400);

  const gemini = new GoogleGenAI({ apiKey });
  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, FALLBACK_MODEL])];
  for (const model of models) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: body.prompt,
        config: {
          systemInstruction: body.systemInstruction,
          responseMimeType: body.json ? 'application/json' : undefined,
        },
      });
      if (response.text) return jsonResponse({ text: response.text });
    } catch (error) {
      console.error(`Gemini request failed (${model})`, error);
      if (!RETRYABLE_STATUSES.includes((error as { status?: number }).status ?? 0)) break;
    }
  }
  return jsonResponse({ error: AI_ERRORS.unavailable }, 502);
}
