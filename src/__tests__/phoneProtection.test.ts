import { describe, it, expect } from 'vitest';
import { encryptPhone, decryptPhone, maskPhone } from '../lib/phoneProtection';

describe('Phone Protection — encryptPhone & decryptPhone', () => {
  it('encrypts raw phone number to protected enc: string', () => {
    const raw = '7842777347';
    const encrypted = encryptPhone(raw);

    expect(encrypted).not.toBe(raw);
    expect(encrypted).not.toContain(raw);
    expect(encrypted.startsWith('enc:')).toBe(true);
  });

  it('decrypts encrypted enc: string back to raw phone number', () => {
    const raw = '7842777347';
    const encrypted = encryptPhone(raw);
    const decrypted = decryptPhone(encrypted);

    expect(decrypted).toBe(raw);
  });

  it('handles empty / null / undefined inputs gracefully', () => {
    expect(encryptPhone('')).toBe('');
    expect(encryptPhone(null)).toBe('');
    expect(encryptPhone(undefined)).toBe('');

    expect(decryptPhone('')).toBe('');
    expect(decryptPhone(null)).toBe('');
    expect(decryptPhone(undefined)).toBe('');
  });

  it('is idempotent when re-encrypting an already encrypted string', () => {
    const encrypted = encryptPhone('7842777347');
    const doubleEncrypted = encryptPhone(encrypted);

    expect(doubleEncrypted).toBe(encrypted);
  });

  it('masks phone number for public display', () => {
    const raw = '7842777347';
    const encrypted = encryptPhone(raw);
    const masked = maskPhone(encrypted);

    expect(masked).not.toContain('7842777347');
    expect(masked).toBe('7842****47');
  });
});
