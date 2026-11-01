export interface ProfileFormValues {
  displayName: string;
  photoURL: string;
  bio: string;
  location: string;
  phone: string;
}

export type ProfileField = keyof ProfileFormValues;
export type ProfileValidationErrors = Partial<Record<ProfileField, string>>;

export function validateProfile(values: ProfileFormValues): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const displayName = values.displayName.trim();
  const photoURL = values.photoURL.trim();
  const bio = values.bio.trim();
  const location = values.location.trim();
  const phone = values.phone.trim();

  if (!displayName) errors.displayName = 'Ingresá tu nombre para continuar.';
  else if (displayName.length > 80) errors.displayName = 'El nombre no puede superar los 80 caracteres.';

  if (photoURL) {
    try {
      const url = new URL(photoURL);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.photoURL = 'Ingresá una URL válida que comience con http:// o https://.';
    }
  }
  if (photoURL.length > 1000) errors.photoURL = 'La URL de la foto no puede superar los 1000 caracteres.';
  if (bio.length > 500) errors.bio = 'La biografía no puede superar los 500 caracteres.';
  if (location.length > 120) errors.location = 'La ubicación no puede superar los 120 caracteres.';
  if (phone.length > 40) errors.phone = 'El teléfono no puede superar los 40 caracteres.';
  else if (phone && !/^[+\d\s().-]+$/.test(phone))
    errors.phone = 'Usá sólo números, espacios y los signos +, -, ( ) o punto.';

  return errors;
}
