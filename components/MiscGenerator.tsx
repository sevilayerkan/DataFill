"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { nameData as enNameData } from "@/data/en/name-data"
import { nameData as trNameData } from "@/data/tr/name-data"
import { passwordData as enPasswordData } from "@/data/en/password-data"
import { passwordData as trPasswordData } from "@/data/tr/password-data"
import { generatePhoneNumber, getPhoneCountry, phoneCountries } from "@/data/phone-data"
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

type DataType = "fullName" | "email" | "address" | "password" | "phone" | "uuid" | "date" | "tckn" | "username"
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
  const firsts =
    gender === "male" ? data.maleNames : gender === "female" ? data.femaleNames : [...data.maleNames, ...data.femaleNames]
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

const ADDRESS_STREETS = ["Main", "Oak", "Pine", "Cedar"]

function generateValue(
  type: Exclude<DataType, "fullName" | "date" | "password">,
  phoneCountryCode = "US",
  rand?: RandomSource,
): string {
  switch (type) {
    case "email": return `user${randomDigits(8, rand)}@example.com`
    case "address": return `${randomInt(900, rand) + 100} ${ADDRESS_STREETS[randomInt(ADDRESS_STREETS.length, rand)]} Street, New York, NY`
    case "phone": return generatePhoneNumber(getPhoneCountry(phoneCountryCode, "US"), rand)
    case "uuid": return randomUUID()
    case "tckn": return generateTCKN(rand)
    case "username": return `user${randomDigits(8, rand)}`
  }
}

export function MiscGenerator({ onCopy, language }: Props) {
  const { t } = useTranslation(language)
  const [type, setType] = useState<DataType>("fullName")
  const [count, setCount] = useState(1)
  // Raw input draft: clearing the field must not push 0/NaN into state.
  // Committed (clamped) on blur/Generate instead.
  const [countDraft, setCountDraft] = useState("1")
  const [format, setFormat] = useState<OutputFormat>("text")
  const [phoneCountryCode, setPhoneCountryCode] = useState("US")
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

  // Row ids/values need client-side randomness: populate after mount so the
  // SSR/prerender output stays deterministic and hydration matches.
  useEffect(() => {
    const rows: ExportRow[] = [{ id: randomUUID(), value: takeUnique(fullNamePool(language), 1)[0] }]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportRows(rows)
    setValue(rows.map((row) => row.value).join("\n"))
    // Initial language only; later changes apply on the next generate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatRows = (rows: ExportRow[], outputFormat: OutputFormat) => {
    if (outputFormat === "json") return formatJson(rows, false)
    if (outputFormat === "jsonWithId") return formatJson(rows, true)
    if (outputFormat === "csv") return formatCsv(rows, false)
    if (outputFormat === "csvWithId") return formatCsv(rows, true)
    return rows.map((row) => row.value).join("\n")
  }

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
    let values: string[]
    if (nextType === "fullName") {
      // Finite pool sampled without replacement:
      // uniqueness is structurally guaranteed for any reachable count.
      values = takeUnique(fullNamePool(language, nextNameGender), safeCount)
    } else if (nextType === "date") {
      // Finite 2000-day pool sampled without replacement.
      values = takeUnique(datePool(), safeCount)
    } else if (nextType === "password") {
      if (nextPasswordSource === "random") {
        // Fully random: pure charset sampling, no words, language-independent.
        values = generateRandomPasswords(safeCount, nextRandomPasswordOptions)
      } else {
        // Dile göre küratörlü havuzdan tekrarsız; havuz aşımında türevlerle tamamlanır.
        values = uniquePasswords(safeCount, language)
      }
    } else {
      // Effectively infinite spaces (2^122 UUIDs, 10^8 emails, ...):
      // retry-with-set makes collisions practically impossible.
      const seen = new Set<string>()
      values = []
      let attempts = 0
      while (values.length < safeCount && attempts < safeCount * 20 + 20) {
        attempts += 1
        const candidate = generateValue(nextType, nextPhoneCountryCode)
        if (seen.has(candidate)) continue
        seen.add(candidate)
        values.push(candidate)
      }
      while (values.length < safeCount) {
        values.push(generateValue(nextType, nextPhoneCountryCode))
      }
    }
    const rows: ExportRow[] = values.map((item) => ({ id: randomUUID(), value: item }))
    setExportRows(rows)
    setValue(formatRows(rows, nextFormat))
  }
  const copyValue = async () => {
    const ok = await copyTextToClipboard(value)
    onCopy(ok ? t("miscCopied") : t("copyFailed"))
  }

  const reformat = (nextFormat: OutputFormat) => {
    setFormat(nextFormat)
    setValue(formatRows(exportRows, nextFormat))
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
          <SelectItem value="username">{t("miscUsername")}</SelectItem>
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
      <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm whitespace-pre-wrap break-all" aria-live="polite">{value}</pre>
      <div className="flex gap-2">
        <Button type="button" onClick={() => generate()}>{t("miscGenerate")}</Button>
        <Button type="button" variant="outline" onClick={copyValue}>{t("miscCopy")}</Button>
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

