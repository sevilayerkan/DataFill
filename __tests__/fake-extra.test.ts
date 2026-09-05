import { describe, it, expect } from "vitest";
import {
  detectCreditCardBrand,
  ean13CheckDigit,
  generateBooleanValue,
  generateCompanyName,
  generateCoordinates,
  generateCreditCardNumber,
  generateCreditCardValue,
  generateEan13,
  generateHash,
  generateHexColor,
  generateIpv4,
  generateIpv6,
  generateJobTitle,
  generateMac,
  generateSlug,
  isValidLuhn,
  EN_JOB_TITLES,
  TR_JOB_TITLES,
} from "../lib/fake-extra";
import {
  generateLoremParagraph,
  generateLoremSentence,
  LOREM_WORDS_TR,
} from "../lib/lorem";
import { buildMiscValues } from "../components/MiscGenerator";
import { buildPersona } from "../components/DatasetBuilder";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe("credit card (Luhn test numbers)", () => {
  it("generates Luhn-valid numbers with known brand prefixes", () => {
    for (const seed of [1, 7, 42, 999]) {
      const number = generateCreditCardNumber(lcg(seed));
      expect(number).toMatch(/^\d{15,16}$/);
      expect(isValidLuhn(number)).toBe(true);
      expect(["Visa", "Mastercard", "Amex", "Discover"]).toContain(
        detectCreditCardBrand(number),
      );
      expect(isValidLuhn(generateCreditCardValue(lcg(seed)))).toBe(true);
    }
  });

  it("is deterministic with an injected source", () => {
    expect(generateCreditCardNumber(lcg(5))).toBe(generateCreditCardNumber(lcg(5)));
  });
});

describe("company + job title", () => {
  it("generates non-empty company names per language", () => {
    for (const seed of [1, 2, 3]) {
      expect(generateCompanyName("en", lcg(seed)).length).toBeGreaterThan(3);
      expect(generateCompanyName("tr", lcg(seed)).length).toBeGreaterThan(3);
    }
    expect(generateCompanyName("tr", lcg(11))).toMatch(/[\wçğıöşüÇĞİÖŞÜ. ]+/);
  });

  it("picks job titles from the curated per-language lists", () => {
    for (const seed of [1, 2, 3, 4]) {
      expect(EN_JOB_TITLES).toContain(generateJobTitle("en", lcg(seed)));
      expect(TR_JOB_TITLES).toContain(generateJobTitle("tr", lcg(seed)));
    }
  });
});

describe("slug / color / network / geo / hash / barcode / boolean", () => {
  it("generates URL-safe slugs", () => {
    for (const seed of [1, 9, 27]) {
      expect(generateSlug("en", lcg(seed))).toMatch(/^[a-z0-9]+(-[a-z0-9]+){1,3}$/);
      expect(generateSlug("tr", lcg(seed))).toMatch(/^[a-z0-9]+(-[a-z0-9]+){1,3}$/);
    }
  });

  it("generates hex colors", () => {
    for (const seed of [1, 2, 3]) {
      expect(generateHexColor(lcg(seed))).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("generates valid IPv4 / IPv6 / MAC", () => {
    for (const seed of [1, 5, 13]) {
      const v4 = generateIpv4(lcg(seed));
      expect(v4).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
      for (const octet of v4.split(".").map(Number)) {
        expect(octet).toBeGreaterThanOrEqual(0);
        expect(octet).toBeLessThanOrEqual(255);
      }
      expect(generateIpv6(lcg(seed))).toMatch(/^([0-9a-f]{4}:){7}[0-9a-f]{4}$/);
      const mac = generateMac(lcg(seed));
      expect(mac).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
      // Unicast: first octet even.
      expect(parseInt(mac.slice(0, 2), 16) % 2).toBe(0);
    }
  });

  it("generates in-range coordinates", () => {
    for (const seed of [2, 8, 21]) {
      const coords = generateCoordinates(lcg(seed));
      const [lat, lng] = coords.split(",").map((s) => Number(s.trim()));
      expect(coords).toMatch(/^-?\d+\.\d{6}, -?\d+\.\d{6}$/);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    }
  });

  it("generates hash placeholders of the right shape", () => {
    expect(generateHash("md5", lcg(1))).toMatch(/^[0-9a-f]{32}$/);
    expect(generateHash("sha1", lcg(1))).toMatch(/^[0-9a-f]{40}$/);
    expect(generateHash("sha256", lcg(1))).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates EAN-13 barcodes with a valid check digit", () => {
    for (const seed of [3, 11, 77]) {
      const code = generateEan13(lcg(seed));
      expect(code).toMatch(/^\d{13}$/);
      expect(ean13CheckDigit(code.slice(0, 12))).toBe(code.slice(-1));
    }
  });

  it("generates booleans", () => {
    const rand = lcg(123);
    const values = new Set(Array.from({ length: 20 }, () => generateBooleanValue(rand)));
    expect([...values].sort()).toEqual(["false", "true"]);
  });
});

describe("lorem sentence / paragraph (EN + TR)", () => {
  it("generates well-formed sentences", () => {
    for (const seed of [1, 2, 3]) {
      const en = generateLoremSentence("en", lcg(seed));
      expect(en).toMatch(/^[A-Z].*\.$/);
      expect(en.split(" ").length).toBeGreaterThanOrEqual(6);
      const tr = generateLoremSentence("tr", lcg(seed));
      expect(tr).toMatch(/^[A-ZÇĞİÖŞÜ].*\.$/);
      expect(tr.split(" ").length).toBeGreaterThanOrEqual(6);
    }
  });

  it("uses the Turkish word pool for TR output", () => {
    const trWords = new Set(LOREM_WORDS_TR.map((w) => w.toLocaleLowerCase("tr")));
    for (let seed = 1; seed <= 5; seed++) {
      const words = generateLoremSentence("tr", lcg(seed))
        .replace(/\.$/, "")
        .toLocaleLowerCase("tr")
        .split(" ");
      for (const w of words) expect(trWords.has(w)).toBe(true);
    }
  });

  it("joins 3–6 sentences into a paragraph", () => {
    for (const seed of [4, 9, 15]) {
      const para = generateLoremParagraph("tr", lcg(seed));
      const sentences = para.split(". ").length;
      expect(sentences).toBeGreaterThanOrEqual(3);
      expect(sentences).toBeLessThanOrEqual(6);
    }
  });
});

describe("Misc + Dataset integration", () => {
  const base = {
    language: "tr" as const,
    phoneCountryCode: "TR",
    nameGender: "unisex" as const,
    passwordSource: "wordlist" as const,
    randomPasswordOptions: {
      length: 16,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
    },
  };

  it("builds values for every new type", () => {
    const expectations: Record<string, RegExp> = {
      company: /.{3,}/,
      jobTitle: /.{3,}/,
      creditCard: /^[\d ]{18,19}$/,
      slug: /^[a-z0-9-]+$/,
      color: /^#[0-9a-f]{6}$/,
      ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
      ipv6: /^([0-9a-f]{4}:){7}[0-9a-f]{4}$/,
      mac: /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/,
      coordinates: /^-?\d+\.\d{6}, -?\d+\.\d{6}$/,
      hash: /^[0-9a-f]{64}$/,
      barcode: /^\d{13}$/,
      boolean: /^(true|false)$/,
      sentence: /\.$/,
      paragraph: /\..*?\./,
    };
    for (const [type, pattern] of Object.entries(expectations)) {
      const values = buildMiscValues(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { ...base, count: 3, type: type as any },
        lcg(42),
      );
      expect(values).toHaveLength(3);
      for (const v of values) expect(v).toMatch(pattern);
    }
  });

  it("includes company + jobTitle in dataset personas", () => {
    const persona = buildPersona("tr", "TR", "pw-1", lcg(7));
    expect(persona.company.length).toBeGreaterThan(3);
    expect(TR_JOB_TITLES).toContain(persona.jobTitle);
  });
});
