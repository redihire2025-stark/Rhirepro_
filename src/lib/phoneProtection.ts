// Secret salt for phone encryption
const PHONE_SALT = "rhirepro_phone_sec_2026";

/** Encrypts raw phone number so cleartext mobile numbers never travel in network payloads or DB responses */
export function encryptPhone(phone: string | null | undefined): string {
  const cleanPhone = (phone || "").trim();
  if (!cleanPhone) return "";
  if (cleanPhone.startsWith("enc:")) return cleanPhone; // Already encrypted

  let result = "";
  for (let i = 0; i < cleanPhone.length; i++) {
    const charCode = cleanPhone.charCodeAt(i);
    const saltCode = PHONE_SALT.charCodeAt(i % PHONE_SALT.length);
    const encCode = charCode ^ saltCode;
    result += encCode.toString(16).padStart(2, "0");
  }
  return `enc:${result}`;
}

/** Decrypts phone number for authorized UI form rendering */
export function decryptPhone(encryptedPhone: string | null | undefined): string {
  const clean = (encryptedPhone || "").trim();
  if (!clean) return "";
  if (!clean.startsWith("enc:")) return clean; // Unencrypted legacy number

  const hexData = clean.slice(4);
  let result = "";
  for (let i = 0; i < hexData.length; i += 2) {
    const hex = hexData.slice(i, i + 2);
    const encCode = parseInt(hex, 16);
    const saltCode = PHONE_SALT.charCodeAt((i / 2) % PHONE_SALT.length);
    const charCode = encCode ^ saltCode;
    result += String.fromCharCode(charCode);
  }
  return result;
}

/** Masks phone number for public display (e.g. 78427***** / +91 78427*****) */
export function maskPhone(phone: string | null | undefined): string {
  const raw = decryptPhone(phone);
  if (!raw || raw.length < 5) return raw;
  const visiblePrefix = raw.slice(0, 4);
  const visibleSuffix = raw.slice(-2);
  const maskedLength = Math.max(2, raw.length - 6);
  return `${visiblePrefix}${"*".repeat(maskedLength)}${visibleSuffix}`;
}
