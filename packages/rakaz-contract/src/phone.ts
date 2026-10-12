const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic-Indic / Persian digits to Latin digits. */
export function toLatinDigits(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const a = ARABIC_DIGITS.indexOf(ch);
    const p = PERSIAN_DIGITS.indexOf(ch);
    out += a >= 0 ? String(a) : p >= 0 ? String(p) : ch;
  }
  return out;
}

/**
 * Normalizes an Iraqi mobile number to E.164 (`+9647XXXXXXXXX`).
 * Accepts `07701234567`, `7701234567`, `+9647701234567`, `009647701234567` and Arabic digits.
 * Returns null when the input is not a valid Iraqi mobile number.
 */
export function normalizeIraqiPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = toLatinDigits(raw).replace(/\D/g, '');
  if (d.startsWith('00964')) d = d.slice(5);
  else if (d.startsWith('964')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length !== 10 || !d.startsWith('7')) return null;
  return `+964${d}`;
}

/** Local display form: `07701234567`. */
export function formatIraqiPhoneLocal(e164: string): string {
  return e164.startsWith('+964') ? `0${e164.slice(4)}` : e164;
}
