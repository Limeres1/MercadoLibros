import { auth } from '@/services/firebase';

export const API_ERRORS = {
  notLoggedIn: 'Iniciá sesión para continuar.',
  network: 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
  unknown: 'Ocurrió un error inesperado. Intentá de nuevo.',
};

export class ApiError extends Error {}

export async function postApi<T>(route: string, body: object): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new ApiError(API_ERRORS.notLoggedIn);

  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new ApiError(API_ERRORS.network);
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || API_ERRORS.unknown);
  return data as T;
}
