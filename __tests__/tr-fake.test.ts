import { describe, it, expect } from "vitest"
import {
  foldTrLower,
  formatTrGsm,
  generatePlate,
  generateTrIban,
  generateTrNationalNumber,
  generateVkn,
  TR_MOBILE_PREFIXES,
} from "../lib/tr-fake"
import { generateAddressValue, generateEmailAddress, generatePhoneValue, generateUsername } from "../components/MiscGenerator"
import { generateNationalNumber, getPhoneCountry } from "../data/phone-data"

/** Deterministic LCG for injected-source tests. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

/** ISO 13616 mod-97 check: a valid IBAN yields remainder 1. */
function ibanMod97(iban: string): number {
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`
  const numeric = rearranged
    .toUpperCase()
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0)
      return code >= 48 && code <= 57 ? ch : String(code - 55)
    })
    .join("")
  let remainder = 0
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97
  return remainder
}

describe("TR IBAN", () => {
  it("produces 26-char TR IBANs that pass mod-97", () => {
    for (const seed of [1, 7, 42, 12345]) {
      const iban = generateTrIban(lcg(seed))
      expect(iban).toMatch(/^TR\d{24}$/)
      expect(iban).toHaveLength(26)
      expect(ibanMod97(iban)).toBe(1)
    }
  })

  it("is deterministic with an injected source", () => {
    expect(generateTrIban(lcg(9))).toBe(generateTrIban(lcg(9)))
  })
})

describe("TR VKN and plate", () => {
  it("produces 10-digit VKNs with a non-zero lead", () => {
    for (const seed of [3, 11, 999]) {
      expect(generateVkn(lcg(seed))).toMatch(/^[1-9]\d{9}$/)
    }
  })

  it("produces plates shaped like `34 AB 123` with provinces 01-81", () => {
    for (const seed of [5, 21, 777]) {
      const plate = generatePlate(lcg(seed))
      expect(plate).toMatch(/^\d{2} [A-Z]{1,3} \d{2,4}$/)
      const province = Number(plate.slice(0, 2))
      expect(province).toBeGreaterThanOrEqual(1)
      expect(province).toBeLessThanOrEqual(81)
      expect(plate).not.toMatch(/[QWX]/)
    }
  })
})

describe("TR GSM", () => {
  it("uses operator-realistic prefixes and formats as `05xx xxx xx xx`", () => {
    for (const seed of [2, 8, 31337]) {
      const national = generateTrNationalNumber(lcg(seed))
      expect(national).toMatch(/^5\d{9}$/)
      expect(TR_MOBILE_PREFIXES).toContain(national.slice(0, 3))
      expect(formatTrGsm(national)).toMatch(/^05\d{2} \d{3} \d{2} \d{2}$/)
    }
  })

  it("keeps the raw international generator prefix-realistic", () => {
    const national = generateNationalNumber(getPhoneCountry("TR"), lcg(14))
    expect(TR_MOBILE_PREFIXES).toContain(national.slice(0, 3))
  })

  it("renders TR phones nationally in Misc output", () => {
    expect(generatePhoneValue("TR", lcg(6))).toMatch(/^05\d{2} \d{3} \d{2} \d{2}$/)
    expect(generatePhoneValue("US", lcg(6))).toMatch(/^\+1\d{10}$/)
  })
})

describe("language-aware Misc values", () => {
  it("never emits `user<digits>@example.com` emails", () => {
    for (const language of ["en", "tr"] as const) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const email = generateEmailAddress(language, lcg(seed))
        expect(email).not.toMatch(/^user\d+@example\.com$/)
        expect(email).toMatch(/^[a-z0-9._-]+@[a-z.]+\.[a-z]+$/)
      }
    }
  })

  it("folds Turkish characters in TR email local-parts", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const email = generateEmailAddress("tr", lcg(seed))
      expect(email.split("@")[0]).not.toMatch(/[çğıöşü]/)
    }
    expect(foldTrLower("Çağıl IŞIK Ü")).toBe("cagil isik u")
  })

  it("generates Turkish `mahalle/ilçe/il` addresses for TR, US ones for EN", () => {
    for (const seed of [1, 9, 27]) {
      const tr = generateAddressValue("tr", lcg(seed))
      expect(tr).toMatch(/(Mahallesi|Bulvarı|Caddesi|Sokak|Meydanı)/)
      expect(tr).not.toMatch(/New York/)
      const en = generateAddressValue("en", lcg(seed))
      expect(en).toMatch(/^\d+ .+, .+, [A-Z]{2} \d{5}$/)
    }
  })

  it("builds usernames from the name lists, never `user<8 digits>`", () => {
    for (const language of ["en", "tr"] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const username = generateUsername(language, lcg(seed))
        expect(username).not.toMatch(/^user\d+$/)
        expect(username).toMatch(/^[a-z0-9._-]+$/)
        expect(username.length).toBeGreaterThan(3)
      }
    }
  })

  it("folds Turkish characters in TR usernames", () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(generateUsername("tr", lcg(seed))).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
    }
  })

  it("is deterministic with an injected source", () => {
    expect(generateUsername("tr", lcg(12))).toBe(generateUsername("tr", lcg(12)))
    expect(generateUsername("en", lcg(12))).toBe(generateUsername("en", lcg(12)))
  })
})
