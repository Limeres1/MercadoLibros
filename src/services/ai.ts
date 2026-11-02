import { API_ROUTES } from '@/constants/api';
import { auth } from '@/services/firebase';

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  json?: boolean;
}

export const AI_CLIENT_ERRORS = {
  notLoggedIn: 'Iniciá sesión para usar las funciones de IA.',
  network: 'No pudimos conectarnos con la IA. Revisá tu conexión e intentá de nuevo.',
  unknown: 'La IA no está disponible en este momento. Intentá más tarde.',
};

export class AIError extends Error {}

export async function askAI(request: AIRequest): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new AIError(AI_CLIENT_ERRORS.notLoggedIn);

  const response = await fetch(API_ROUTES.ai, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  }).catch(() => {
    throw new AIError(AI_CLIENT_ERRORS.network);
  });

  const data: { text?: string; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.text !== 'string') {
    throw new AIError(data.error || AI_CLIENT_ERRORS.unknown);
  }
  return data.text;
}
