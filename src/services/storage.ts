import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/services/firebase';

export const ASSET_CONSTRAINTS = {
  cover: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxSizeLabel: '5 MB',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    label: 'Portada',
    formatError: 'Formato no permitido para la portada. Solo se aceptan imágenes JPG, PNG o WebP.',
    sizeError: 'El archivo de la portada supera el tamaño máximo permitido de 5 MB.',
  },
  bookFile: {
    maxSizeBytes: 20 * 1024 * 1024, // 20 MB
    maxSizeLabel: '20 MB',
    allowedTypes: ['application/pdf', 'application/epub+zip', 'text/plain'],
    allowedExtensions: ['.pdf', '.epub', '.txt'],
    label: 'Archivo del libro',
    formatError: 'Formato no permitido para el archivo del libro. Solo se aceptan archivos PDF, EPUB o TXT.',
    sizeError: 'El archivo del libro supera el tamaño máximo permitido de 20 MB.',
  },
  sampleFile: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeLabel: '10 MB',
    allowedTypes: ['application/pdf', 'application/epub+zip', 'text/plain'],
    allowedExtensions: ['.pdf', '.epub', '.txt'],
    label: 'Muestra gratuita',
    formatError: 'Formato no permitido para la muestra gratuita. Solo se aceptan archivos PDF, EPUB o TXT.',
    sizeError: 'El archivo de muestra gratuita supera el tamaño máximo permitido de 10 MB.',
  },
} as const;

export type AssetType = keyof typeof ASSET_CONSTRAINTS;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAssetFile(file: File, assetType: AssetType): ValidationResult {
  const constraint = ASSET_CONSTRAINTS[assetType];
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const isTypeAllowed = (constraint.allowedTypes as readonly string[]).includes(file.type);
  const isExtAllowed = (constraint.allowedExtensions as readonly string[]).includes(extension);

  if (!isTypeAllowed && !isExtAllowed) {
    return { valid: false, error: constraint.formatError };
  }

  if (file.size > constraint.maxSizeBytes) {
    return { valid: false, error: constraint.sizeError };
  }

  return { valid: true };
}

export async function uploadBookAsset(bookId: string, file: File, assetType: AssetType): Promise<string> {
  const validation = validateAssetFile(file, assetType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `books/${bookId}/${assetType}_${Date.now()}_${cleanFileName}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

