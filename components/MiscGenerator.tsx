"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { nameData as enNameData } from "@/data/en/name-data"
import { nameData as trNameData } from "@/data/tr/name-data"
import { passwordData as enPasswordData } from "@/data/en/password-data"
import { passwordData as trPasswordData } from "@/data/tr/password-data"
import { generatePhoneNumber, getPhoneCountry, phoneCountries, formatPhoneForDisplay } from "@/data/phone-data"
import { emailData as enEmailData } from "@/data/en/email-data"
import { emailData as trEmailData } from "@/data/tr/email-data"
import { addressData as enAddressData } from "@/data/en/address-data"
import { addressData as trAddressData } from "@/data/tr/address-data"
import { foldTrLower, generateTrIban, generateVkn, generatePlate } from "@/lib/tr-fake"
import {
  generateBooleanValue,
  generateCompanyName,
  generateCoordinates,
  generateCreditCardValue,
  generateEan13,
  generateHash,
  generateHexColor,
  generateIpv4,
  generateIpv6,
  generateJobTitle,
  generateMac,
  generateSlug,
} from "@/lib/fake-extra"
import { generateLoremParagraph, generateLoremSentence } from "@/lib/lorem"
import { copyTextToClipboard } from "@/lib/clipboard"
import { parseNumericDraft } from "@/lib/numeric-input"
import { randomInt, randomUUID, type RandomSource } from "@/lib/random"
import { useTranslation } from "@/hooks/useTranslation"
import {
  buildExportFilename,
  downloadTextFile,
  formatCsv,
  formatJson,
  type ExportRow,
} from "@/lib/export"

type DataType =
  | "fullName"
  | "email"
  | "address"
  | "password"
  | "phone"
  | "uuid"
  | "date"
  | "tckn"
  | "iban"
  | "vkn"
  | "plate"
  | "username"
  | "company"
  | "jobTitle"
  | "creditCard"
  | "slug"
  | "color"
  | "ipv4"
  | "ipv6"
  | "mac"
  | "coordinates"
  | "hash"
  | "barcode"
  | "boolean"
  | "sentence"
  | "paragraph"
export type OutputFormat = "text" | "json" | "jsonWithId" | "csv" | "csvWithId"
export type ExportFormat = Exclude<OutputFormat, "text">
export type NameGender = "male" | "female" | "unisex"
export type PasswordSource = "wordlist" | "random"

export interface RandomPasswordOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
}

export const RANDOM_PASSWORD_MIN_LENGTH = 4
export const RANDOM_PASSWORD_MAX_LENGTH = 128
export const DEFAULT_RANDOM_PASSWORD_OPTIONS: RandomPasswordOptions = {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
}

const LOWER_CHARS = "abcdefghijklmnopqrstuvwxyz"
const UPPER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const DIGIT_CHARS = "0123456789"
const SYMBOL_CHARS = "!@#$%^&*()-_=+[]{};:,.<>?"

type Props = {
  onCopy: (message: string) => void
  language: "en" | "tr"
}

/** Maximum items per batch (also the Count input's max). Output is capped at the pool size when a pool is smaller (e.g. single-gender en names). */
const MAX_COUNT = 1000

const fullNamePoolCache = new Map<string, string[]>()
let datePoolCache: { key: string; pool: string[] } | null = null
const passwordPoolCache = new Map<"en" | "tr", string[]>()

/**
 * Full-name pool per language and gender (unisex = male + female first names).
 * Built once per language/gender and cached: callers (generate-on-keystroke
 * handlers) must treat the result as read-only.
 */
export function fullNamePool(language: "en" | "tr", gender: NameGender = "unisex"): string[] {
  const key = `${language}:${gender}`
  const cached = fullNamePoolCache.get(key)
  if (cached) return cached
  const data = language === "tr" ? trNameData : enNameData
  // Unisex merges both lists; a name can appear in both (e.g. TR "Deniz"),
  // so dedupe firsts to keep the pool duplicate-free and sampling unique.
  const firsts =
    gender === "male" ? data.maleNames : gender === "female" ? data.femaleNames : [...new Set([...data.maleNames, ...data.femaleNames])]
  const pool: string[] = []
  for (const first of firsts) {
    for (const last of data.lastNames) {
      pool.push(`${first} ${last}`)
    }
  }
  fullNamePoolCache.set(key, pool)
  return pool
}

/**
 * 2000 consecutive dates starting today, formatted in local time (no UTC day-shift).
 * Cached per calendar day; pass `now` in tests for deterministic output.
 */
export function datePool(now: Date = new Date()): string[] {
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  if (datePoolCache?.key === dayKey) return datePoolCache.pool
  const start = new Date(now.getTime())
  start.setHours(0, 0, 0, 0)
  const pool = Array.from({ length: 2 * MAX_COUNT }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000)
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${month}-${day}`
  })
  datePoolCache = { key: dayKey, pool }
  return pool
}

/**
 * Dile göre üretim havuzu: yalnızca harf+rakam karışık şifreler (tek kelimeler elenmiş).
 * Cached per language; treat the result as read-only.
 */
export function passwordPool(language: "en" | "tr"): string[] {
  const cached = passwordPoolCache.get(language)
  if (cached) return cached
  const pool = [...(language === "tr" ? trPasswordData : enPasswordData).mixed]
  passwordPoolCache.set(language, pool)
  return pool
}

/** Unique passwords: shuffled pool first, then pool-based suffixed variants if n exceeds the pool. */
export function uniquePasswords(n: number, language: "en" | "tr", rand?: RandomSource): string[] {
  const pool = passwordPool(language)
  const values = takeUnique(pool, n, rand)
  if (values.length >= n) return values
  const seen = new Set(values)
  let guard = 0
  while (values.length < n && guard < n * 50 + 50) {
    guard += 1
    const candidate = `${pool[randomInt(pool.length, rand)]}-${randomDigits(6, rand)}`
    if (seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }
  // Practically unreachable: index-suffixed fallback is unique by construction.
  while (values.length < n) {
    values.push(`${pool[values.length % pool.length]}-x${values.length}-${randomDigits(6, rand)}`)
  }
  return values
}

/** Charset for fully-random passwords. Falls back to lowercase when nothing is selected. */
export function buildPasswordCharset(options: RandomPasswordOptions): string {
  let charset = ""
  if (options.lowercase) charset += LOWER_CHARS
  if (options.uppercase) charset += UPPER_CHARS
  if (options.digits) charset += DIGIT_CHARS
  if (options.symbols) charset += SYMBOL_CHARS
  return charset || LOWER_CHARS
}

export function clampPasswordLength(length: number): number {
  if (!Number.isFinite(length)) return DEFAULT_RANDOM_PASSWORD_OPTIONS.length
  return Math.min(
    RANDOM_PASSWORD_MAX_LENGTH,
    Math.max(RANDOM_PASSWORD_MIN_LENGTH, Math.floor(length)),
  )
}

/**
 * Fully-random password: pure charset sampling, no words, no language dependence.
 * Guarantees at least one char from each enabled set when length allows it.
 */
export function generateRandomPassword(
  length: number,
  options: RandomPasswordOptions = DEFAULT_RANDOM_PASSWORD_OPTIONS,
  rand?: RandomSource,
): string {
  const safeLength = clampPasswordLength(length)
  const charset = buildPasswordCharset(options)
  const chars: string[] = Array.from({ length: safeLength }, () => charset[randomInt(charset.length, rand)])

  const required: string[] = []
  if (options.lowercase) required.push(LOWER_CHARS[randomInt(LOWER_CHARS.length, rand)])
  if (options.uppercase) required.push(UPPER_CHARS[randomInt(UPPER_CHARS.length, rand)])
  if (options.digits) required.push(DIGIT_CHARS[randomInt(DIGIT_CHARS.length, rand)])
  if (options.symbols) required.push(SYMBOL_CHARS[randomInt(SYMBOL_CHARS.length, rand)])

  // No charset selected -> charset already fell back to lowercase, nothing to force.
  const enabledSets = required.length
  if (enabledSets === 0 || safeLength < enabledSets) return chars.join("")

  const positions = new Set<number>()
  for (const char of required) {
    let pos = randomInt(safeLength, rand)
    while (positions.has(pos)) pos = randomInt(safeLength, rand)
    positions.add(pos)
    chars[pos] = char
  }
  return chars.join("")
}

/** Unique fully-random passwords via retry-with-set (effectively infinite space). */
export function generateRandomPasswords(
  n: number,
  options: RandomPasswordOptions = DEFAULT_RANDOM_PASSWORD_OPTIONS,
  rand?: RandomSource,
): string[] {
  const safeN = Math.min(MAX_COUNT, Math.max(1, Math.floor(n) || 1))
  const safeLength = clampPasswordLength(options.length)
  const seen = new Set<string>()
  const values: string[] = []
  let attempts = 0
  while (values.length < safeN && attempts < safeN * 20 + 20) {
    attempts += 1
    const candidate = generateRandomPassword(safeLength, options, rand)
    if (seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }
  while (values.length < safeN) {
    values.push(generateRandomPassword(safeLength, { ...options, length: safeLength }, rand))
  }
  return values
}

/**
 * Uniform random sample of up to `n` pool items in random order, without
 * replacement. Index-based (Floyd's subset + partial shuffle): O(n) time and
 * memory, so taking 1 item from a 2000-entry pool no longer copies and
 * shuffles the whole pool. Never mutates `pool`.
 */
export function sampleUnique<T>(pool: readonly T[], n: number, rand?: RandomSource): T[] {
  const count = Math.min(Math.max(0, Math.floor(n) || 0), pool.length)
  if (count === 0) return []
  // Floyd's algorithm: uniform subset of `count` indices in O(count).
  const selected = new Set<number>()
  for (let i = pool.length - count; i < pool.length; i++) {
    const j = randomInt(i + 1, rand)
    selected.add(selected.has(j) ? i : j)
  }
  // Partial Fisher-Yates over the subset for random order.
  const indices = [...selected]
  for (let i = indices.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rand)
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.map((i) => pool[i])
}

/**
 * Fisher-Yates shuffle + take: strict sampling without replacement.
 * Kept for compatibility; delegates to the O(n) {@link sampleUnique}.
 */
export function takeUnique<T>(pool: T[], n: number, rand?: RandomSource): T[] {
  return sampleUnique(pool, n, rand)
}

function randomDigits(length: number, rand?: RandomSource) {
  return Array.from({ length }, () => randomInt(10, rand)).join("")
}

export function generateTCKN(rand?: RandomSource) {
  // TCKN is formed from nine random digits and two check digits.
  // The first digit cannot be zero.
  const digits = [randomInt(9, rand) + 1, ...Array.from({ length: 8 }, () => randomInt(10, rand))]
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  const tenthDigit = ((oddSum * 7 - evenSum) % 10 + 10) % 10
  const eleventhDigit = digits.reduce((sum, digit) => sum + digit, 0) + tenthDigit

  return [...digits, tenthDigit, eleventhDigit % 10].join("")
}

/**
 * Shared persona identity: one folded `first`/`last` pair (ASCII, lowercase)
 * plus the display name. Dataset rows reuse a single identity so `fullName`,
 * `email` and `username` stay mutually consistent.
 */
export interface PersonaIdentity {
  /** Display name with original casing, e.g. `Ahmet Yılmaz`. */
  display: string
  /** Folded, lowercase first name (TR chars folded), e.g. `ahmet`. */
  first: string
  /** Folded, lowercase last name, e.g. `yilmaz`. */
  last: string
}

export function pickPersonaIdentity(language: "en" | "tr", rand?: RandomSource): PersonaIdentity {
  const isTr = language === "tr"
  const data = isTr ? trNameData : enNameData
  const firstRaw = data.maleNames.concat(data.femaleNames)[randomInt(data.maleNames.length + data.femaleNames.length, rand)]
  const lastRaw = data.lastNames[randomInt(data.lastNames.length, rand)]
  return {
    display: `${firstRaw} ${lastRaw}`,
    first: isTr ? foldTrLower(firstRaw) : firstRaw.toLowerCase(),
    last: isTr ? foldTrLower(lastRaw) : lastRaw.toLowerCase(),
  }
}

/** E-mail local-part from an already-folded identity (`ad.soyad`, `adsoyad`, …). */
export function buildEmailLocal(first: string, last: string, rand?: RandomSource): string {
  const style = randomInt(100, rand);
  let local: string;
  if (style < 35) local = `${first}.${last}`;
  else if (style < 55) local = `${first}${last}`;
  else if (style < 65) local = `${first}_${last}`;
  else if (style < 75) local = `${first[0]}${last}`;
  else if (style < 85) local = `${first}.${last[0]}`;
  else local = `${first}-${last}`;
  const suffixRoll = randomInt(100, rand);
  if (suffixRoll >= 50) local += randomDigits(suffixRoll >= 80 ? 3 : 2, rand);
  return local;
}

/** Username handle from an already-folded identity (`adsoyad`, `ad.soyad`, …). */
export function buildUsernameHandle(first: string, last: string, rand?: RandomSource): string {
  const style = randomInt(100, rand);
  let handle: string;
  if (style < 30) handle = `${first}${last}`;
  else if (style < 50) handle = `${first}.${last}`;
  else if (style < 65) handle = `${first}_${last}`;
  else if (style < 75) handle = `${first}-${last}`;
  else if (style < 85) handle = `${first[0]}${last}`;
  else if (style < 93) handle = `${first}${last[0]}`;
  else handle = `${first[0]}_${last}`;
  const suffixRoll = randomInt(100, rand);
  if (suffixRoll >= 40) handle += randomDigits(suffixRoll >= 85 ? 4 : suffixRoll >= 60 ? 3 : 2, rand);
  return handle;
}

/**
 * Name-linked, realistic e-mail local-parts per language (never
 * `user12345678@example.com`): `ad.soyad`, `adsoyad`, `ad_soyad`,
 * `asoyad`, `ad.s` + an optional short numeric suffix (max 4 digits).
 */
export function generateEmailAddress(language: "en" | "tr", rand?: RandomSource): string {
  const pick = <T,>(pool: readonly T[]): T => pool[randomInt(pool.length, rand)];
  const identity = pickPersonaIdentity(language, rand);
  const local = buildEmailLocal(identity.first, identity.last, rand);
  const domains = language === "tr" ? trEmailData.domains : enEmailData.domains;
  return `${local}@${pick(domains)}`;
}

/** Language-aware address: TR picks a full `mahalle/ilçe/il` address, EN builds a US one. */
export function generateAddressValue(language: "en" | "tr", rand?: RandomSource): string {
  if (language === "tr") {
    const fullAddresses = (trAddressData as { fullAddresses?: string[] }).fullAddresses;
    if (fullAddresses && fullAddresses.length > 0) {
      return fullAddresses[randomInt(fullAddresses.length, rand)];
    }
    const streets = trAddressData.streets;
    const districts = (trAddressData as { districts?: string[] }).districts ?? trAddressData.cities;
    const number = randomInt(200, rand) + 1;
    return `${streets[randomInt(streets.length, rand)]} No: ${number}, ${districts[randomInt(districts.length, rand)]}, ${trAddressData.cities[randomInt(trAddressData.cities.length, rand)]}`;
  }
  const number = randomInt(1000, rand) + 1;
  const street = enAddressData.streets[randomInt(enAddressData.streets.length, rand)];
  const city = enAddressData.cities[randomInt(enAddressData.cities.length, rand)];
  const state = enAddressData.states[randomInt(enAddressData.states.length, rand)];
  const zip = randomInt(90000, rand) + 10000;
  return `${number} ${street}, ${city}, ${state} ${zip}`;
}

/** Phone per selected country; TR renders as national `05xx xxx xx xx`. */
export function generatePhoneValue(phoneCountryCode: string, rand?: RandomSource): string {
  const country = getPhoneCountry(phoneCountryCode, "US");
  const e164 = generatePhoneNumber(country, rand);
  if (country.code === "TR") return formatPhoneForDisplay(country, e164);
  return e164;
}

/**
 * Name-linked username per language (never `user12345678`): `adsoyad`,
 * `ad.soyad`, `ad_soyad`, `ad-soyad`, `asoyad` + an optional short numeric
 * suffix (max 4 digits). ASCII-only: TR names are folded.
 */
export function generateUsername(language: "en" | "tr", rand?: RandomSource): string {
  const identity = pickPersonaIdentity(language, rand);
  return buildUsernameHandle(identity.first, identity.last, rand);
}

/**
 * Shareable generator settings, e.g. `?type=email&count=10&country=TR`.
 * `parseMiscUrlParams` validates and ignores anything unknown;
 * `buildMiscUrlParams` renders the canonical query string.
 */
export interface MiscShareState {
  type: DataType
  count: number
  format: OutputFormat
  phoneCountryCode: string
  nameGender: NameGender
}

const SHARE_TYPES: readonly string[] = [
  "fullName",
  "email",
  "address",
  "password",
  "phone",
  "uuid",
  "date",
  "tckn",
  "iban",
  "vkn",
  "plate",
  "username",
  "company",
  "jobTitle",
  "creditCard",
  "slug",
  "color",
  "ipv4",
  "ipv6",
  "mac",
  "coordinates",
  "hash",
  "barcode",
  "boolean",
  "sentence",
  "paragraph",
]
const SHARE_FORMATS: readonly string[] = ["text", "json", "jsonWithId", "csv", "csvWithId"]
const SHARE_GENDERS: readonly string[] = ["male", "female", "unisex"]

export function parseMiscUrlParams(search: string): Partial<MiscShareState> {
  const params = new URLSearchParams(search)
  const parsed: Partial<MiscShareState> = {}
  const type = params.get("type")
  if (type && (SHARE_TYPES as readonly string[]).includes(type)) parsed.type = type as DataType
  const countRaw = params.get("count")
  if (countRaw !== null) {
    const count = Math.floor(Number(countRaw))
    if (Number.isFinite(count)) parsed.count = Math.min(MAX_COUNT, Math.max(1, count))
  }
  const format = params.get("format")
  if (format && (SHARE_FORMATS as readonly string[]).includes(format)) parsed.format = format as OutputFormat
  const country = params.get("country")
  if (country && phoneCountries.some((c) => c.code === country)) parsed.phoneCountryCode = country
  const gender = params.get("gender")
  if (gender && (SHARE_GENDERS as readonly string[]).includes(gender)) parsed.nameGender = gender as NameGender
  return parsed
}

export function buildMiscUrlParams(state: MiscShareState): string {
  const params = new URLSearchParams()
  params.set("type", state.type)
  params.set("count", String(state.count))
  params.set("format", state.format)
  params.set("country", state.phoneCountryCode)
  // Gender only shapes full-name output: keep unrelated links clean.
  if (state.type === "fullName") params.set("gender", state.nameGender)
  return `?${params.toString()}`
}

/** Reflect the current generator settings in the address bar (no reload). Cleans stale `tool` param so `?type=username&tab=misc` stays consistent. */
export function syncShareUrl(state: MiscShareState): void {
  try {
    const params = new URLSearchParams(window.location.search)
    params.set("type", state.type)
    params.set("count", String(state.count))
    params.set("format", state.format)
    params.set("country", state.phoneCountryCode)
    if (state.type === "fullName") params.set("gender", state.nameGender)
    else params.delete("gender")
    params.delete("tool")
    params.set("tab", "misc")
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
  } catch {
    // Non-browser or restricted contexts (SSR, some tests): sharing is a no-op.
  }
}

export interface BuildMiscValuesOptions {
  type: DataType
  count: number
  language: "en" | "tr"
  phoneCountryCode: string
  nameGender: NameGender
  passwordSource: PasswordSource
  randomPasswordOptions: RandomPasswordOptions
}

/** Pure value construction shared by interactive generate and URL-restored init. */
export function buildMiscValues(options: BuildMiscValuesOptions, rand?: RandomSource): string[] {
  const { type, count, language, phoneCountryCode, nameGender, passwordSource, randomPasswordOptions } = options
  const safeCount = Math.min(MAX_COUNT, Math.max(1, Math.floor(count) || 1))
  if (type === "fullName") {
    // Finite pool sampled without replacement:
    // uniqueness is structurally guaranteed for any reachable count.
    return takeUnique(fullNamePool(language, nameGender), safeCount, rand)
  }
  if (type === "date") {
    // Finite 2000-day pool sampled without replacement.
    return takeUnique(datePool(), safeCount, rand)
  }
  if (type === "password") {
    if (passwordSource === "random") {
      // Fully random: pure charset sampling, no words, language-independent.
      return generateRandomPasswords(safeCount, randomPasswordOptions, rand)
    }
    // Dile göre küratörlü havuzdan tekrarsız; havuz aşımında türevlerle tamamlanır.
    return uniquePasswords(safeCount, language, rand)
  }
  // Effectively infinite spaces (2^122 UUIDs, large email/address spaces, ...):
  // retry-with-set makes collisions practically impossible.
  const seen = new Set<string>()
  const values: string[] = []
  let attempts = 0
  while (values.length < safeCount && attempts < safeCount * 20 + 20) {
    attempts += 1
    const candidate = generateValue(type, language, phoneCountryCode, rand)
    if (seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }
  while (values.length < safeCount) {
    values.push(generateValue(type, language, phoneCountryCode, rand))
  }
  return values
}

/** Pure row formatting shared by generate, reformat and URL-restored init. */
export function formatMiscRows(rows: ExportRow[], outputFormat: OutputFormat): string {
  if (outputFormat === "json") return formatJson(rows, false)
  if (outputFormat === "jsonWithId") return formatJson(rows, true)
  if (outputFormat === "csv") return formatCsv(rows, false)
  if (outputFormat === "csvWithId") return formatCsv(rows, true)
  return rows.map((row) => row.value).join("\n")
}

function generateValue(
  type: Exclude<DataType, "fullName" | "date" | "password">,
  language: "en" | "tr",
  phoneCountryCode = "US",
  rand?: RandomSource,
): string {
  switch (type) {
    case "email": return generateEmailAddress(language, rand)
    case "address": return generateAddressValue(language, rand)
    case "phone": return generatePhoneValue(phoneCountryCode, rand)
    case "uuid": return randomUUID()
    case "tckn": return generateTCKN(rand)
    case "iban": return generateTrIban(rand)
    case "vkn": return generateVkn(rand)
    case "plate": return generatePlate(rand)
    case "username": return generateUsername(language, rand)
    case "company": return generateCompanyName(language, rand)
    case "jobTitle": return generateJobTitle(language, rand)
    case "creditCard": return generateCreditCardValue(rand)
    case "slug": return generateSlug(language, rand)
    case "color": return generateHexColor(rand)
    case "ipv4": return generateIpv4(rand)
    case "ipv6": return generateIpv6(rand)
    case "mac": return generateMac(rand)
    case "coordinates": return generateCoordinates(rand)
    case "hash": return generateHash("sha256", rand)
    case "barcode": return generateEan13(rand)
    case "boolean": return generateBooleanValue(rand)
    case "sentence": return generateLoremSentence(language, rand)
    case "paragraph": return generateLoremParagraph(language, rand)
  }
}

// Re-exported for DatasetBuilder + tests so persona rows stay consistent.
export {
  generateBooleanValue,
  generateCompanyName,
  generateCoordinates,
  generateCreditCardValue,
  generateEan13,
  generateHash,
  generateHexColor,
  generateIpv4,
  generateIpv6,
  generateJobTitle,
  generateMac,
  generateSlug,
};
export { generateLoremParagraph, generateLoremSentence };

export function MiscGenerator({ onCopy, language }: Props) {
  const { t } = useTranslation(language)
  const [type, setType] = useState<DataType>("fullName")
  const [count, setCount] = useState(1)
  // Raw input draft: clearing the field must not push 0/NaN into state.
  // Committed (clamped) on blur/Generate instead.
  const [countDraft, setCountDraft] = useState("1")
  const [format, setFormat] = useState<OutputFormat>("text")
  const [phoneCountryCode, setPhoneCountryCode] = useState(language === "tr" ? "TR" : "US")
  const [nameGender, setNameGender] = useState<NameGender>("unisex")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json")
  const [passwordSource, setPasswordSource] = useState<PasswordSource>("wordlist")
  const [randomPasswordOptions, setRandomPasswordOptions] = useState<RandomPasswordOptions>(
    DEFAULT_RANDOM_PASSWORD_OPTIONS,
  )
  // Raw length draft: clearing the field must not snap the value to the min.
  // Committed (clamped) on blur; valid keystrokes regenerate live.
  const [passwordLengthDraft, setPasswordLengthDraft] = useState(String(DEFAULT_RANDOM_PASSWORD_OPTIONS.length))
  const [exportRows, setExportRows] = useState<ExportRow[]>([])
  const [value, setValue] = useState("")

  // Keep the phone default aligned with the UI language until the user
  // picks a country explicitly (or opens a share link pinning one).
  const countryTouched = useRef(false)

  // Row ids/values need client-side randomness: populate after mount so the
  // SSR/prerender output stays deterministic and hydration matches.
  // A share link (`?type=email&count=10&country=TR`) restores the settings here.
  useEffect(() => {
    const params = parseMiscUrlParams(window.location.search)
    const effType = params.type ?? "fullName"
    const effFormat = params.format ?? "text"
    const effCountry = params.phoneCountryCode ?? (language === "tr" ? "TR" : "US")
    const effGender = params.nameGender ?? "unisex"
    const effCount = params.count ?? 1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(effType)
    setFormat(effFormat)
    setPhoneCountryCode(effCountry)
    setNameGender(effGender)
    setCount(effCount)
    setCountDraft(String(effCount))
    if (params.phoneCountryCode) countryTouched.current = true
    const rows: ExportRow[] = buildMiscValues({
      type: effType,
      count: effCount,
      language,
      phoneCountryCode: effCountry,
      nameGender: effGender,
      passwordSource: "wordlist",
      randomPasswordOptions: DEFAULT_RANDOM_PASSWORD_OPTIONS,
    }).map((item) => ({ id: randomUUID(), value: item }))
    setExportRows(rows)
    setValue(formatMiscRows(rows, effFormat))
    // Initial language only; later changes apply on the next generate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the phone default aligned with the UI language until the user
  // picks a country explicitly (or opens a share link pinning one).
  // Runs after the init effect above, which marks URL-pinned countries touched.
  useEffect(() => {
    if (!countryTouched.current) {
      setPhoneCountryCode(language === "tr" ? "TR" : "US")
    }
  }, [language])

  /** Normalize the count draft into state; returns the effective count. */
  const commitCount = (): number => {
    const parsed = parseNumericDraft(countDraft)
    if (parsed === null) {
      // Empty/invalid: keep editing, revert the field to the last good value.
      setCountDraft(String(count))
      return count
    }
    const safeCount = Math.min(MAX_COUNT, Math.max(1, Math.floor(parsed)))
    setCount(safeCount)
    setCountDraft(String(safeCount))
    return safeCount
  }

  const generate = (
    nextType = type,
    nextFormat = format,
    nextPhoneCountryCode = phoneCountryCode,
    nextNameGender = nameGender,
    nextPasswordSource = passwordSource,
    nextRandomPasswordOptions = randomPasswordOptions,
  ) => {
    const safeCount = commitCount()
    const values = buildMiscValues({
      type: nextType,
      count: safeCount,
      language,
      phoneCountryCode: nextPhoneCountryCode,
      nameGender: nextNameGender,
      passwordSource: nextPasswordSource,
      randomPasswordOptions: nextRandomPasswordOptions,
    })
    const rows: ExportRow[] = values.map((item) => ({ id: randomUUID(), value: item }))
    setExportRows(rows)
    setValue(formatMiscRows(rows, nextFormat))
    syncShareUrl({
      type: nextType,
      count: safeCount,
      format: nextFormat,
      phoneCountryCode: nextPhoneCountryCode,
      nameGender: nextNameGender,
    })
  }
  const copyValue = async () => {
    const ok = await copyTextToClipboard(value)
    onCopy(ok ? t("miscCopied") : t("copyFailed"))
  }
  const copyLine = async (line: string) => {
    const ok = await copyTextToClipboard(line)
    onCopy(ok ? t("miscCopied") : t("copyFailed"))
  }
  const shareLink = async () => {
    const ok = await copyTextToClipboard(window.location.href)
    onCopy(ok ? t("miscLinkCopied") : t("copyFailed"))
  }

  const reformat = (nextFormat: OutputFormat) => {
    setFormat(nextFormat)
    setValue(formatMiscRows(exportRows, nextFormat))
  }

  const exportFile = () => {
    const withId = exportFormat === "jsonWithId" || exportFormat === "csvWithId"
    const isJson = exportFormat === "json" || exportFormat === "jsonWithId"
    const ext = isJson ? "json" : "csv"
    const content = isJson ? formatJson(exportRows, withId) : formatCsv(exportRows, withId)
    downloadTextFile(
      buildExportFilename(`fadelytext-${type}-${exportRows.length}`, ext),
      content,
      isJson ? "application/json" : "text/csv",
    )
    onCopy(isJson ? t("miscExportedJson") : t("miscExportedCsv"))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{t("miscCount")}</span>
          <input
            className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            type="number"
            min={1}
            max={MAX_COUNT}
            step={1}
            value={countDraft}
            onChange={(event) => setCountDraft(event.target.value)}
            onBlur={() => {
              commitCount()
            }}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{t("miscFormat")}</span>
          <Select value={format} onValueChange={(next) => {
        reformat(next as OutputFormat)
      }}>
            <SelectTrigger aria-label={t("miscFormat")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">{t("miscPlainText")}</SelectItem>
              <SelectItem value="json">{t("miscJson")}</SelectItem>
              <SelectItem value="jsonWithId">{t("miscJsonWithId")}</SelectItem>
              <SelectItem value="csv">{t("miscCsv")}</SelectItem>
              <SelectItem value="csvWithId">{t("miscCsvWithId")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <Select value={type} onValueChange={(next) => {
        const nextType = next as DataType
        setType(nextType)
        generate(nextType, format)
      }}>
        <SelectTrigger aria-label={t("miscSelectDataType")}>
          <SelectValue placeholder={t("miscSelectDataType")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fullName">{t("miscFullName")}</SelectItem>
          <SelectItem value="email">{t("miscEmail")}</SelectItem>
          <SelectItem value="address">{t("miscAddress")}</SelectItem>
          <SelectItem value="password">{t("miscPassword")}</SelectItem>
          <SelectItem value="phone">{t("miscPhone")}</SelectItem>
          <SelectItem value="uuid">{t("miscUuid")}</SelectItem>
          <SelectItem value="date">{t("miscDate")}</SelectItem>
          <SelectItem value="tckn">{t("miscTckn")}</SelectItem>
          <SelectItem value="iban">{t("miscIban")}</SelectItem>
          <SelectItem value="vkn">{t("miscVkn")}</SelectItem>
          <SelectItem value="plate">{t("miscPlate")}</SelectItem>
          <SelectItem value="username">{t("miscUsername")}</SelectItem>
          <SelectItem value="company">{t("miscCompany")}</SelectItem>
          <SelectItem value="jobTitle">{t("miscJobTitle")}</SelectItem>
          <SelectItem value="creditCard">{t("miscCreditCard")}</SelectItem>
          <SelectItem value="slug">{t("miscSlug")}</SelectItem>
          <SelectItem value="color">{t("miscColor")}</SelectItem>
          <SelectItem value="ipv4">{t("miscIpv4")}</SelectItem>
          <SelectItem value="ipv6">{t("miscIpv6")}</SelectItem>
          <SelectItem value="mac">{t("miscMac")}</SelectItem>
          <SelectItem value="coordinates">{t("miscCoordinates")}</SelectItem>
          <SelectItem value="hash">{t("miscHash")}</SelectItem>
          <SelectItem value="barcode">{t("miscBarcode")}</SelectItem>
          <SelectItem value="boolean">{t("miscBoolean")}</SelectItem>
          <SelectItem value="sentence">{t("miscSentence")}</SelectItem>
          <SelectItem value="paragraph">{t("miscParagraph")}</SelectItem>
        </SelectContent>
      </Select>
      {type === "fullName" && (
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{t("miscGender")}</span>
          <Select value={nameGender} onValueChange={(next) => {
            const nextGender = next as NameGender
            setNameGender(nextGender)
            generate("fullName", format, phoneCountryCode, nextGender)
          }}>
            <SelectTrigger aria-label={t("miscGender")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t("miscMan")}</SelectItem>
              <SelectItem value="female">{t("miscWoman")}</SelectItem>
              <SelectItem value="unisex">{t("miscUnisex")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      )}
      {type === "password" && (
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>{t("miscPasswordSource")}</span>
            <Select value={passwordSource} onValueChange={(next) => {
              const nextSource = next as PasswordSource
              setPasswordSource(nextSource)
              generate("password", format, phoneCountryCode, nameGender, nextSource, randomPasswordOptions)
            }}>
              <SelectTrigger aria-label={t("miscPasswordSource")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wordlist">{t("miscWordlist")}</SelectItem>
                <SelectItem value="random">{t("miscFullyRandom")}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {passwordSource === "random" && (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>{t("miscPasswordLength")}</span>
                <input
                  className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                  type="number"
                  min={RANDOM_PASSWORD_MIN_LENGTH}
                  max={RANDOM_PASSWORD_MAX_LENGTH}
                  step={1}
                  value={passwordLengthDraft}
                  aria-label={t("miscPasswordLength")}
                  onChange={(event) => {
                    const raw = event.target.value
                    setPasswordLengthDraft(raw)
                    const parsed = parseNumericDraft(raw)
                    if (parsed === null) return // Empty/partial: keep editing.
                    const nextOptions = {
                      ...randomPasswordOptions,
                      length: clampPasswordLength(parsed),
                    }
                    setRandomPasswordOptions(nextOptions)
                    generate("password", format, phoneCountryCode, nameGender, "random", nextOptions)
                  }}
                  onBlur={() => {
                    const parsed = parseNumericDraft(passwordLengthDraft)
                    if (parsed === null) {
                      setPasswordLengthDraft(String(randomPasswordOptions.length))
                      return
                    }
                    const nextOptions = {
                      ...randomPasswordOptions,
                      length: clampPasswordLength(parsed),
                    }
                    setRandomPasswordOptions(nextOptions)
                    setPasswordLengthDraft(String(nextOptions.length))
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "lowercase" as const, label: t("miscLowercase") },
                    { key: "uppercase" as const, label: t("miscUppercase") },
                    { key: "digits" as const, label: t("miscDigits") },
                    { key: "symbols" as const, label: t("miscSymbols") },
                  ]
                ).map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox
                      checked={randomPasswordOptions[option.key]}
                      aria-label={option.label}
                      onCheckedChange={(checked) => {
                        const nextOptions = { ...randomPasswordOptions, [option.key]: checked === true }
                        // Keep at least one charset enabled.
                        if (!nextOptions.lowercase && !nextOptions.uppercase && !nextOptions.digits && !nextOptions.symbols) {
                          nextOptions[option.key] = true
                          return
                        }
                        setRandomPasswordOptions(nextOptions)
                        generate("password", format, phoneCountryCode, nameGender, "random", nextOptions)
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {type === "phone" && (
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{t("miscCountry")}</span>
          <Select value={phoneCountryCode} onValueChange={(next) => {
            countryTouched.current = true
            setPhoneCountryCode(next)
            generate("phone", format, next)
          }}>
            <SelectTrigger aria-label={t("miscCountry")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {phoneCountries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.phoneCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
      {format === "text" ? (
        <ul className="max-h-[400px] space-y-1 overflow-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm" aria-live="polite">
          {exportRows.map((row, index) => (
            <li key={row.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {type === "color" && (
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 rounded-sm border border-border shadow-sm"
                    style={{ backgroundColor: row.value }}
                    title={row.value}
                  />
                )}
                <span className="whitespace-pre-wrap break-all">{row.value}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={`${t("miscCopyLine")} ${index + 1}`}
                onClick={() => copyLine(row.value)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {index < exportRows.length - 1 ? "\n" : null}
            </li>
          ))}
        </ul>
      ) : (
        <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm whitespace-pre-wrap break-all" aria-live="polite">{value}</pre>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={() => generate()}>{t("miscGenerate")}</Button>
        <Button type="button" variant="outline" onClick={copyValue}>{t("miscCopy")}</Button>
        <Button type="button" variant="outline" onClick={shareLink}>
          <Share2 className="h-3.5 w-3.5" />
          {t("miscShare")}
        </Button>
      </div>
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{t("miscExportFormat")}</span>
          <Select value={exportFormat} onValueChange={(next) => setExportFormat(next as ExportFormat)}>
            <SelectTrigger aria-label={t("miscExportFormat")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">{t("miscJson")}</SelectItem>
              <SelectItem value="jsonWithId">{t("miscJsonWithId")}</SelectItem>
              <SelectItem value="csv">{t("miscCsv")}</SelectItem>
              <SelectItem value="csvWithId">{t("miscCsvWithId")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Button type="button" variant="outline" onClick={exportFile}>{t("miscExport")}</Button>
      </div>
    </div>
  )
}

