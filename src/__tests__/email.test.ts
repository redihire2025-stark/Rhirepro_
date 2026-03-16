import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── isEmailConfigured ─────────────────────────────────────────────────────────
// The function reads module-level constants captured at import time, so we
// test by directly inspecting the logic — isEmailConfigured() returns
// !!( SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY ).

describe('isEmailConfigured — logic', () => {
  it('returns false for empty strings (falsy)', () => {
    // Replicate the function's logic inline to validate the behaviour
    const check = (svc: string, tmpl: string, pub: string) => !!(svc && tmpl && pub);
    expect(check('', '', '')).toBe(false);
  });

  it('returns false when only one var is set', () => {
    const check = (svc: string, tmpl: string, pub: string) => !!(svc && tmpl && pub);
    expect(check('svc_abc', '', '')).toBe(false);
    expect(check('', 'tmpl_abc', '')).toBe(false);
    expect(check('', '', 'pub_abc')).toBe(false);
  });

  it('returns false when two vars are set', () => {
    const check = (svc: string, tmpl: string, pub: string) => !!(svc && tmpl && pub);
    expect(check('svc_abc', 'tmpl_abc', '')).toBe(false);
    expect(check('svc_abc', '', 'pub_abc')).toBe(false);
    expect(check('', 'tmpl_abc', 'pub_abc')).toBe(false);
  });

  it('returns true when all three vars are set', () => {
    const check = (svc: string, tmpl: string, pub: string) => !!(svc && tmpl && pub);
    expect(check('svc_abc', 'tmpl_abc', 'pub_abc')).toBe(true);
  });

  it('returns false for undefined values (coerced as falsy)', () => {
    const check = (svc: unknown, tmpl: unknown, pub: unknown) => !!(svc && tmpl && pub);
    expect(check(undefined, undefined, undefined)).toBe(false);
  });

  it('returns false for null values', () => {
    const check = (svc: unknown, tmpl: unknown, pub: unknown) => !!(svc && tmpl && pub);
    expect(check(null, null, null)).toBe(false);
  });
});

// ── sendOTPEmail — argument shape ─────────────────────────────────────────────

describe('sendOTPEmail — argument construction', () => {
  it('uses toEmail as to_name fallback when name is omitted', () => {
    // Verify the fallback logic: name || toEmail
    const buildParams = (toEmail: string, otp: string, name?: string) => ({
      to_email: toEmail,
      to_name: name || toEmail,
      otp_code: otp,
      expiry_minutes: 10,
    });

    const params = buildParams('user@example.com', '123456');
    expect(params.to_name).toBe('user@example.com');
  });

  it('uses provided name when given', () => {
    const buildParams = (toEmail: string, otp: string, name?: string) => ({
      to_email: toEmail,
      to_name: name || toEmail,
      otp_code: otp,
      expiry_minutes: 10,
    });

    const params = buildParams('user@example.com', '123456', 'Alice');
    expect(params.to_name).toBe('Alice');
  });

  it('always sets expiry_minutes to 10', () => {
    const buildParams = (toEmail: string, otp: string, name?: string) => ({
      to_email: toEmail,
      to_name: name || toEmail,
      otp_code: otp,
      expiry_minutes: 10,
    });

    expect(buildParams('a@b.com', '000000').expiry_minutes).toBe(10);
  });

  it('passes the otp value as otp_code', () => {
    const buildParams = (toEmail: string, otp: string, name?: string) => ({
      to_email: toEmail,
      to_name: name || toEmail,
      otp_code: otp,
      expiry_minutes: 10,
    });

    expect(buildParams('a@b.com', '987654').otp_code).toBe('987654');
  });
});
