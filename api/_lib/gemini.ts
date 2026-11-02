import { GoogleGenAI } from '@google/genai';

const GEMINI_TIMEOUT_MS = 12_000;
const GEMINI_MIN_TIMEOUT_MS = 10_000;
const GEMINI_BUDGET_MS = 27_000;
const DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const RETRYABLE_STATUSES = [404, 429, 500, 503, 504];

export interface GenerateRequest {
  contents: string;
  systemInstruction?: string;
  json?: boolean;
}

export const geminiModels = () =>
  [...new Set([process.env.GEMINI_MODEL, ...DEFAULT_MODELS])].filter((model): model is string => Boolean(model));

export async function generateText(apiKey: string, request: GenerateRequest): Promise<string | null> {
  const gemini = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS, retryOptions: { attempts: 1 } },
  });
  const deadline = Date.now() + GEMINI_BUDGET_MS;
  for (const model of geminiModels()) {
    const remaining = deadline - Date.now();
    if (remaining < GEMINI_MIN_TIMEOUT_MS) break;
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: request.contents,
        config: {
          systemInstruction: request.systemInstruction,
          responseMimeType: request.json ? 'application/json' : undefined,
          httpOptions: { timeout: Math.min(GEMINI_TIMEOUT_MS, remaining) },
        },
      });
      if (response.text) return response.text;
      console.warn(`Gemini returned an empty response (${model})`);
    } catch (error) {
      const status = (error as { status?: number }).status;
      console.error(`Gemini request failed (${model}, status ${status ?? 'timeout'})`);
      if (status && !RETRYABLE_STATUSES.includes(status)) break;
    }
  }
  return null;
}
