import { randomInt, type RandomSource } from "@/lib/random";
import { TR_MOBILE_PREFIXES, formatTrGsm } from "@/lib/tr-fake";

export { TR_MOBILE_PREFIXES, formatTrGsm };

export interface PhoneCountry {
  /** Display name (English). */
  name: string
  /** ISO 3166-1 alpha-2 code, used as select value. */
  code: string
  /** International dial prefix, e.g. "+90". */
  phoneCode: string
  /** National (subscriber) digit count, excluding the dial prefix. */
  nationalLength: number
  /**
   * Optional leading-digit constraint for realistic mobile numbers,
   * e.g. Turkey mobiles start with "5". First generated digit is drawn from this set.
   */
  leadingDigits?: string[]
}

/**
 * Shared country list for every phone generator.
 * Order matters: Turkey stays first so the single-phone generator
 * keeps its current default (existing tests rely on `+90` default).
 */
export const phoneCountries: PhoneCountry[] = [
  { name: "Turkey", code: "TR", phoneCode: "+90", nationalLength: 10, leadingDigits: ["5"] },
  { name: "United States", code: "US", phoneCode: "+1", nationalLength: 10 },
  { name: "United Kingdom", code: "GB", phoneCode: "+44", nationalLength: 10 },
  { name: "Germany", code: "DE", phoneCode: "+49", nationalLength: 10 },
  { name: "France", code: "FR", phoneCode: "+33", nationalLength: 9 },
  { name: "Netherlands", code: "NL", phoneCode: "+31", nationalLength: 9 },
  { name: "Spain", code: "ES", phoneCode: "+34", nationalLength: 9 },
  { name: "Italy", code: "IT", phoneCode: "+39", nationalLength: 10 },
  { name: "Canada", code: "CA", phoneCode: "+1", nationalLength: 10 },
  { name: "Azerbaijan", code: "AZ", phoneCode: "+994", nationalLength: 9 },
]

export function getPhoneCountry(code: string, fallbackCode = "TR"): PhoneCountry {
  return phoneCountries.find((c) => c.code === code) ?? phoneCountries.find((c) => c.code === fallbackCode) ?? phoneCountries[0]
}

function randomDigit(rand?: RandomSource): string {
  return randomInt(10, rand).toString()
}

/** Generates the national part honoring length + optional leading-digit constraint. */
export function generateNationalNumber(country: PhoneCountry, rand?: RandomSource): string {
  // Turkey: use operator-realistic 3-digit prefixes (53x/54x/55x/50x).
  if (country.code === "TR") {
    const prefix = TR_MOBILE_PREFIXES[randomInt(TR_MOBILE_PREFIXES.length, rand)];
    const rest = Array.from({ length: Math.max(0, country.nationalLength - prefix.length) }, () =>
      randomDigit(rand),
    ).join("");
    return `${prefix}${rest}`;
  }
  const digits: string[] = []
  for (let i = 0; i < country.nationalLength; i++) {
    if (i === 0 && country.leadingDigits && country.leadingDigits.length > 0) {
      digits.push(country.leadingDigits[randomInt(country.leadingDigits.length, rand)])
    } else {
      digits.push(randomDigit(rand))
    }
  }
  return digits.join("")
}

/** Full international number, e.g. "+905321234567". No spaces so existing `\+\d+` assertions keep passing. */
export function generatePhoneNumber(country: PhoneCountry, rand?: RandomSource): string {
  return `${country.phoneCode}${generateNationalNumber(country, rand)}`
}

/**
 * Display form: TR numbers render in the familiar national GSM shape
 * (`05xx xxx xx xx`); every other country keeps its raw `+<code><digits>` form.
 */
export function formatPhoneForDisplay(country: PhoneCountry, e164: string): string {
  if (country.code !== "TR") return e164;
  const national = e164.startsWith(country.phoneCode) ? e164.slice(country.phoneCode.length) : e164;
  return formatTrGsm(national);
}
