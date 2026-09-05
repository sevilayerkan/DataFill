import { randomInt, type RandomSource } from "./random";

/**
 * Turkey-centric fake-data helpers (test data only — not real identities).
 *
 * Covers the fastest TR wins: valid-mod97 TR IBAN, 10-digit VKN,
 * Turkish licence plate (01–81 + letters + digits) and operator-realistic
 * GSM numbers formatted as `05xx xxx xx xx`.
 */

/** ASCII-fold Turkish text (ç->c, ğ->g, ı/I/İ->i, ö->o, ş->s, ü->u) + lowercase. */
export function foldTrLower(value: string): string {
  return value
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıI]/g, "i")
    .replace(/İ/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .toLowerCase();
}

/**
 * Realistic Turkish mobile prefixes by operator:
 * 53x Turkcell, 54x Vodafone, 55x/50x Türk Telekom.
 */
export const TR_MOBILE_PREFIXES = [
  "530",
  "531",
  "532",
  "533",
  "534",
  "535",
  "536",
  "537",
  "538",
  "539",
  "540",
  "541",
  "542",
  "543",
  "544",
  "545",
  "546",
  "547",
  "548",
  "549",
  "505",
  "506",
  "507",
  "551",
  "552",
  "553",
  "554",
  "555",
  "559",
];

/** 10-digit national mobile number starting with 5, using a realistic prefix. */
export function generateTrNationalNumber(rand?: RandomSource): string {
  const prefix = TR_MOBILE_PREFIXES[randomInt(TR_MOBILE_PREFIXES.length, rand)];
  let suffix = "";
  for (let i = 0; i < 7; i++) suffix += randomInt(10, rand).toString();
  return `${prefix}${suffix}`;
}

/**
 * Format a 10-digit TR national number (`5xxxxxxxxx`) for display:
 * `0532 123 45 67`. Unknown shapes are returned as-is.
 */
export function formatTrGsm(national: string): string {
  const digits = national.replace(/\D/g, "");
  const body = digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^5\d{9}$/.test(body)) return national;
  return `0${body.slice(0, 3)} ${body.slice(3, 6)} ${body.slice(6, 8)} ${body.slice(8, 10)}`;
}

function randomDigits(length: number, rand?: RandomSource): string {
  return Array.from({ length }, () => randomInt(10, rand)).join("");
}

/** IBAN letters -> digits (A=10 … Z=35) for mod-97 validation. */
function ibanToNumeric(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 48 && code <= 57) return ch;
      return String(code - 55);
    })
    .join("");
}

function mod97(value: string): number {
  let remainder = 0;
  for (const ch of value) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  return remainder;
}

/**
 * Random but mod-97 VALID Turkish IBAN (`TRkk` + 22-digit BBAN:
 * 5-digit bank + `0` reserve + 16-digit account). No spaces; grouping is a
 * display concern.
 */
export function generateTrIban(rand?: RandomSource): string {
  const bank = `${randomInt(9, rand) + 1}${randomDigits(4, rand)}`;
  const account = randomDigits(16, rand);
  const bban = `${bank}0${account}`;
  // ISO 13616: check = 98 - mod97(BBAN + "TR00").
  const numeric = `${bban}${ibanToNumeric("TR")}00`;
  const validCheck = 98 - mod97(numeric);
  return `TR${String(validCheck).padStart(2, "0")}${bban}`;
}

/** 10-digit Tax ID (VKN); first digit is never zero. Test data, no checksum claim. */
export function generateVkn(rand?: RandomSource): string {
  return `${randomInt(9, rand) + 1}${randomDigits(9, rand)}`;
}

/** Turkish plates never use Q, W or X. */
const PLATE_LETTERS = "ABCDEFGHJKLMNPRSTUVYZ";

function randomPlateLetters(rand?: RandomSource): string {
  const count = randomInt(3, rand) + 1; // 1–3 letters
  return Array.from({ length: count }, () => PLATE_LETTERS[randomInt(PLATE_LETTERS.length, rand)]).join("");
}

/**
 * Turkish licence plate: `{01–81} {1–3 letters} {2–4 digits}`,
 * e.g. `34 AB 123`, `06 C 4567`.
 */
export function generatePlate(rand?: RandomSource): string {
  const province = randomInt(81, rand) + 1;
  const digits = randomDigits(randomInt(3, rand) + 2, rand); // 2–4 digits
  return `${String(province).padStart(2, "0")} ${randomPlateLetters(rand)} ${digits}`;
}
