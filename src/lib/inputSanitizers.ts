// Keystroke-level input constraints for profile forms — rejects invalid
// characters as they're typed rather than only validating on submit.

/** Digits only, capped at 10 — matches an Indian mobile number. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Restricts to characters a valid email address can actually contain. */
export function sanitizeEmailInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9.@_+-]/g, "");
}

/** Applies the right sanitizer for a named field; passes anything else through. */
export function sanitizeFieldInput(key: string, value: string): string {
  if (key === "phone") return sanitizePhoneInput(value);
  if (key === "email") return sanitizeEmailInput(value);
  return value;
}
