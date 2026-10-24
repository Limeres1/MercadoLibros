const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no tiene un formato válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet e intentá de nuevo.',
  'auth/popup-closed-by-user': 'Se cerró la ventana antes de terminar el inicio de sesión.',
  'permission-denied': 'No tenés permiso para realizar esta acción.',
  unavailable: 'El servicio no está disponible en este momento. Intentá más tarde.',
  'not-found': 'No encontramos lo que buscabas.',
};

const DEFAULT_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.';

export function getErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === 'string' && FIREBASE_MESSAGES[code]) {
    return FIREBASE_MESSAGES[code];
  }
  return DEFAULT_MESSAGE;
}
