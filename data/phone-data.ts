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

function randomDigit(): string {
  return Math.floor(Math.random() * 10).toString()
}

/** Generates the national part honoring length + optional leading-digit constraint. */
export function generateNationalNumber(country: PhoneCountry): string {
  const digits: string[] = []
  for (let i = 0; i < country.nationalLength; i++) {
    if (i === 0 && country.leadingDigits && country.leadingDigits.length > 0) {
      digits.push(country.leadingDigits[Math.floor(Math.random() * country.leadingDigits.length)])
    } else {
      digits.push(randomDigit())
    }
  }
  return digits.join("")
}

/** Full international number, e.g. "+905321234567". No spaces so existing `\+\d+` assertions keep passing. */
export function generatePhoneNumber(country: PhoneCountry): string {
  return `${country.phoneCode}${generateNationalNumber(country)}`
}
