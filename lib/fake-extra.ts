import { randomInt, type RandomSource } from "./random";
import { foldTrLower } from "./tr-fake";

/**
 * Extended fake-data generators (test data only).
 *
 * Every generator accepts an optional injectable {@link RandomSource} so
 * tests run deterministically. Without it the shared WebCrypto-backed
 * `randomInt` is used.
 */

// ---------------------------------------------------------------------------
// Credit card (Luhn-valid test numbers)
// ---------------------------------------------------------------------------

export interface CreditCardBrand {
  brand: string;
  prefixes: string[];
  length: number;
}

/** Test-only brands. Numbers are random Luhn-valid, never real PANs. */
export const CREDIT_CARD_BRANDS: readonly CreditCardBrand[] = [
  { brand: "Visa", prefixes: ["4"], length: 16 },
  { brand: "Mastercard", prefixes: ["51", "52", "53", "54", "55"], length: 16 },
  { brand: "Amex", prefixes: ["34", "37"], length: 15 },
  { brand: "Discover", prefixes: ["6011"], length: 16 },
];

/** Luhn check digit for a partial number (without the final digit). */
export function luhnCheckDigit(partial: string): string {
  let sum = 0;
  const fullLen = partial.length + 1;
  for (let i = 0; i < partial.length; i++) {
    let digit = Number(partial[i]);
    // Double every second digit from the right (excluding the check position).
    const posFromRight = fullLen - i;
    if (posFromRight % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Validate a full card number (spaces/dashes ignored). */
export function isValidLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2) return false;
  return luhnCheckDigit(digits.slice(0, -1)) === digits.slice(-1);
}

function randomDigits(length: number, rand?: RandomSource): string {
  return Array.from({ length }, () => randomInt(10, rand)).join("");
}

/** Random Luhn-valid test card number (digits only, no spaces). */
export function generateCreditCardNumber(rand?: RandomSource): string {
  const spec = CREDIT_CARD_BRANDS[randomInt(CREDIT_CARD_BRANDS.length, rand)];
  const prefix = spec.prefixes[randomInt(spec.prefixes.length, rand)];
  const bodyLen = spec.length - prefix.length - 1;
  const partial = `${prefix}${randomDigits(bodyLen, rand)}`;
  return `${partial}${luhnCheckDigit(partial)}`;
}

/** Detect brand from well-known test prefixes (fallback "Unknown"). */
export function detectCreditCardBrand(number: string): string {
  const digits = number.replace(/\D/g, "");
  for (const spec of CREDIT_CARD_BRANDS) {
    if (spec.prefixes.some((p) => digits.startsWith(p)) && digits.length === spec.length) {
      return spec.brand;
    }
  }
  return "Unknown";
}

/** Display form: groups of 4 separated by spaces (Amex included for simplicity). */
export function formatCreditCardNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** Misc output: spaced Luhn-valid test number, e.g. `4539 1488 0343 6467`. */
export function generateCreditCardValue(rand?: RandomSource): string {
  return formatCreditCardNumber(generateCreditCardNumber(rand));
}

// ---------------------------------------------------------------------------
// Company + job title
// ---------------------------------------------------------------------------

const EN_COMPANY_CORES = [
  "Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne",
  "Aperture", "Nova", "Vertex", "Blue Peak", "Brightline", "Clearview",
  "Northwind", "Silverline", "Golden Gate", "Redwood", "Falcon", "Harbor", "Summit",
];

const EN_COMPANY_SUFFIXES = [
  "Labs", "Industries", "Solutions", "Systems", "Technologies", "Partners",
  "Group", "Holdings", "Ventures", "Works", "Co.", "Inc.", "LLC", "Corp.",
];

const TR_COMPANY_CORES = [
  "Anadolu", "Boğaziçi", "Marmara", "Ege", "Karadeniz", "Akdeniz",
  "İstanbul", "Ankara", "İzmir", "Bursa", "Konya", "Gaziantep",
  "Antalya", "Adana", "Kayseri", "Eskişehir", "Trabzon", "Samsun",
  "Denizli", "Kapadokya",
];

const TR_COMPANY_SUFFIXES = [
  "A.Ş.", "Ltd. Şti.", "Grup", "Holding", "Teknoloji", "Bilişim",
  "İnşaat", "Gıda", "Tekstil", "Lojistik", "Enerji", "Medya",
  "Yazılım", "Danışmanlık", "Ticaret", "Sanayi",
];

export const EN_JOB_TITLES = [
  "Software Engineer", "Product Manager", "Designer", "Data Analyst",
  "Marketing Specialist", "Sales Representative", "Customer Support Specialist",
  "HR Manager", "Accountant", "Project Manager", "DevOps Engineer",
  "QA Engineer", "Business Analyst", "Content Writer", "SEO Specialist",
  "Operations Manager", "Financial Analyst", "UI/UX Designer",
  "System Administrator", "Technical Writer",
];

export const TR_JOB_TITLES = [
  "Yazılım Mühendisi", "Ürün Yöneticisi", "Tasarımcı", "Veri Analisti",
  "Pazarlama Uzmanı", "Satış Temsilcisi", "Müşteri Destek Uzmanı",
  "İK Yöneticisi", "Muhasebeci", "Proje Yöneticisi", "DevOps Mühendisi",
  "Test Mühendisi", "İş Analisti", "İçerik Yazarı", "SEO Uzmanı",
  "Operasyon Yöneticisi", "Finans Analisti", "UI/UX Tasarımcısı",
  "Sistem Yöneticisi", "Teknik Yazar",
];

/** Random company name per UI language, e.g. `Acme Labs` / `Anadolu Bilişim`. */
export function generateCompanyName(language: "en" | "tr", rand?: RandomSource): string {
  if (language === "tr") {
    const core = TR_COMPANY_CORES[randomInt(TR_COMPANY_CORES.length, rand)];
    const suffix = TR_COMPANY_SUFFIXES[randomInt(TR_COMPANY_SUFFIXES.length, rand)];
    return `${core} ${suffix}`;
  }
  const core = EN_COMPANY_CORES[randomInt(EN_COMPANY_CORES.length, rand)];
  const suffix = EN_COMPANY_SUFFIXES[randomInt(EN_COMPANY_SUFFIXES.length, rand)];
  return `${core} ${suffix}`;
}

/** Random job title per UI language. */
export function generateJobTitle(language: "en" | "tr", rand?: RandomSource): string {
  const pool = language === "tr" ? TR_JOB_TITLES : EN_JOB_TITLES;
  return pool[randomInt(pool.length, rand)];
}

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

const SLUG_WORDS_EN = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "harbor", "ivory", "jungle", "karma", "lemon", "mango", "nova",
  "ocean", "pilot", "quartz", "river", "solar", "tango",
  "urban", "violet", "whale", "xenon", "yoga", "zebra",
];

const SLUG_WORDS_TR = [
  "ankara", "bursa", "cagri", "deniz", "efes", "firtina", "gunes",
  "harman", "isik", "kartal", "liman", "marti", "nehir", "ova",
  "pinar", "ruzgar", "sahil", "toprak", "ufuk", "vadi",
  "yamaç", "zeytin", "bulut", "cinar", "doga", "elma",
];

function slugifyWord(word: string): string {
  return foldTrLower(word)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * URL-safe slug: 2–4 lowercase words joined with `-`, e.g. `mango-river-nova`.
 * TR words are ASCII-folded so the output is always URL-safe.
 */
export function generateSlug(language: "en" | "tr", rand?: RandomSource): string {
  const pool = language === "tr" ? SLUG_WORDS_TR : SLUG_WORDS_EN;
  const count = randomInt(3, rand) + 2; // 2–4 words
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(slugifyWord(pool[randomInt(pool.length, rand)]));
  }
  return words.filter(Boolean).join("-") || "lorem-ipsum";
}

// ---------------------------------------------------------------------------
// Color / network / geo / hash / barcode / boolean
// ---------------------------------------------------------------------------

const HEX = "0123456789abcdef";

/** Random hex color, e.g. `#a3e635`. */
export function generateHexColor(rand?: RandomSource): string {
  return `#${Array.from({ length: 6 }, () => HEX[randomInt(16, rand)]).join("")}`;
}

/** Random IPv4, e.g. `192.168.4.21` (never `0.0.0.0` / `255.255.255.255`). */
export function generateIpv4(rand?: RandomSource): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const parts = Array.from({ length: 4 }, () => randomInt(256, rand));
    if (parts.every((p) => p === 0) || parts.every((p) => p === 255)) continue;
    return parts.join(".");
  }
  return "192.168.0.1";
}

/** Random full (uncompressed) IPv6, e.g. `2001:0db8:…`. */
export function generateIpv6(rand?: RandomSource): string {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 4 }, () => HEX[randomInt(16, rand)]).join(""),
  ).join(":");
}

/** Random unicast MAC (`02`-style locally-administered not required; first octet even). */
export function generateMac(rand?: RandomSource): string {
  const bytes = Array.from({ length: 6 }, () => randomInt(256, rand));
  bytes[0] = bytes[0] & 0xfe; // clear multicast bit -> unicast
  return bytes
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":");
}

/** Random `lat, lng` with 6 decimals, e.g. `41.008240, 28.978359`. */
export function generateCoordinates(rand?: RandomSource): string {
  const lat = (rand ? rand() * 180 - 90 : Math.random() * 180 - 90).toFixed(6);
  const lng = (rand ? rand() * 360 - 180 : Math.random() * 360 - 180).toFixed(6);
  return `${lat}, ${lng}`;
}

export type HashAlgorithm = "md5" | "sha1" | "sha256";

const HASH_LENGTHS: Record<HashAlgorithm, number> = {
  md5: 32,
  sha1: 40,
  sha256: 64,
};

/**
 * Random hex digest placeholder of the requested shape (not a real digest
 * of anything — test data). Defaults to SHA-256 shape (64 chars).
 */
export function generateHash(algorithm: HashAlgorithm = "sha256", rand?: RandomSource): string {
  const length = HASH_LENGTHS[algorithm] ?? HASH_LENGTHS.sha256;
  return Array.from({ length }, () => HEX[randomInt(16, rand)]).join("");
}

/** EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/** Random EAN-13 barcode with a valid check digit (13 digits, leading zero allowed). */
export function generateEan13(rand?: RandomSource): string {
  const first12 = randomDigits(12, rand);
  return `${first12}${ean13CheckDigit(first12)}`;
}

/** Random boolean as display string (`"true"` / `"false"` — Misc rows are strings). */
export function generateBooleanValue(rand?: RandomSource): string {
  return randomInt(2, rand) === 0 ? "true" : "false";
}
