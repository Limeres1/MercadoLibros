import { GoogleGenAI } from '@google/genai';

const GEMINI_TIMEOUT_MS = 15_000;
const DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const RETRYABLE_STATUSES = [404, 429, 500, 503];

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
  for (const model of geminiModels()) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: request.contents,
        config: {
          systemInstruction: request.systemInstruction,
          responseMimeType: request.json ? 'application/json' : undefined,
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
