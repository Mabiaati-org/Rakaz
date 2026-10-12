/** Converts Arabic-Indic / Persian digits to Latin digits. */
export declare function toLatinDigits(raw: string): string;
/**
 * Normalizes an Iraqi mobile number to E.164 (`+9647XXXXXXXXX`).
 * Accepts `07701234567`, `7701234567`, `+9647701234567`, `009647701234567` and Arabic digits.
 * Returns null when the input is not a valid Iraqi mobile number.
 */
export declare function normalizeIraqiPhone(raw: string | null | undefined): string | null;
/** Local display form: `07701234567`. */
export declare function formatIraqiPhoneLocal(e164: string): string;
