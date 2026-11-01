import { describe, expect, it } from 'vitest';

import { validateProfile } from '@/features/auth/profileValidation';

const validProfile = {
  displayName: 'Laura Lectora',
  photoURL: 'https://example.com/avatar.jpg',
  bio: 'Me gusta leer.',
  location: 'Buenos Aires',
  phone: '+54 11 1234-5678',
};

describe('validateProfile', () => {
  it('accepts valid profile values and optional empty fields', () => {
    expect(validateProfile(validProfile)).toEqual({});
    expect(validateProfile({ ...validProfile, photoURL: '', bio: '', location: '', phone: '' })).toEqual({});
  });

  it('requires a non-blank name and enforces the profile field limits', () => {
    expect(validateProfile({ ...validProfile, displayName: '  ' }).displayName).toBe(
      'Ingresá tu nombre para continuar.',
    );
    expect(validateProfile({ ...validProfile, displayName: 'a'.repeat(81) }).displayName).toContain('80 caracteres');
    expect(validateProfile({ ...validProfile, bio: 'a'.repeat(501) }).bio).toContain('500 caracteres');
    expect(validateProfile({ ...validProfile, location: 'a'.repeat(121) }).location).toContain('120 caracteres');
    expect(validateProfile({ ...validProfile, phone: '1'.repeat(41) }).phone).toContain('40 caracteres');
  });

  it('rejects invalid photo URLs and unsupported telephone characters', () => {
    expect(validateProfile({ ...validProfile, photoURL: 'javascript:alert(1)' }).photoURL).toContain(
      'http:// o https://',
    );
    expect(validateProfile({ ...validProfile, phone: '123-ABC' }).phone).toContain('Usá sólo números');
  });
});
