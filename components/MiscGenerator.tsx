"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { nameData as enNameData } from "@/data/en/name-data"
import { nameData as trNameData } from "@/data/tr/name-data"
import { passwordData as enPasswordData } from "@/data/en/password-data"
import { passwordData as trPasswordData } from "@/data/tr/password-data"
import { generatePhoneNumber, getPhoneCountry, phoneCountries } from "@/data/phone-data"
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

const labels = {
  en: {
    select: "Select Data Type",
    generate: "Generate",
    copy: "Copy",
    copied: "Copied to clipboard!",
    fullName: "Full Name",
    email: "Email",
    address: "Address",
    password: "Password",
    phone: "Phone",
    uuid: "UUID",
    date: "Date",
    tckn: "TCKN (TR ID)",
    username: "Username",
    count: "Count",
    format: "Format",
    country: "Country",
    gender: "Gender",
    man: "Man",
    woman: "Woman",
    unisex: "Unisex",
    plainText: "Plain Text",
    json: "JSON",
    jsonWithId: "JSON with ID",
    csv: "CSV",
    csvWithId: "CSV with ID",
    export: "Export",
    exportFormat: "Export Format",
    exportedJson: "Exported JSON file!",
    exportedCsv: "Exported CSV file!",
    passwordSource: "Password Source",
    wordlist: "Wordlist",
    fullyRandom: "Fully Random",
    passwordLength: "Password Length",
    lowercase: "Lowercase (a–z)",
    uppercase: "Uppercase (A–Z)",
    digits: "Digits (0–9)",
    symbols: "Symbols (!@#…)",
  },
  tr: {
    select: "Veri Türü Seçin",
    generate: "Üret",
    copy: "Kopyala",
    copied: "Panoya kopyalandı!",
    fullName: "Ad Soyad",
    email: "E-posta",
    address: "Adres",
    password: "Şifre",
    phone: "Telefon",
    uuid: "UUID",
    date: "Tarih",
    tckn: "TCKN",
    username: "Kullanıcı Adı",
    count: "Adet",
    format: "Biçim",
    country: "Ülke",
    gender: "Cinsiyet",
    man: "Erkek",
    woman: "Kadın",
    unisex: "Unisex",
    plainText: "Düz Metin",
    json: "JSON",
    jsonWithId: "ID ile JSON",
    csv: "CSV",
    csvWithId: "ID ile CSV",
    export: "Dışa Aktar",
    exportFormat: "Dışa Aktarma Formatı",
    exportedJson: "JSON dosyası dışa aktarıldı!",
    exportedCsv: "CSV dosyası dışa aktarıldı!",
    passwordSource: "Şifre Kaynağı",
    wordlist: "Kelime Listesi",
    fullyRandom: "Tamamen Rastgele",
    passwordLength: "Şifre Uzunluğu",
    lowercase: "Küçük Harf (a–z)",
    uppercase: "Büyük Harf (A–Z)",
    digits: "Rakam (0–9)",
    symbols: "Sembol (!@#…)",
  },
} as const

/** Maximum items per batch (also the Count input's max). Output is capped at the pool size when a pool is smaller (e.g. single-gender en names). */
const MAX_COUNT = 1000

/** Full-name pool per language and gender (unisex = male + female first names). */
export function fullNamePool(language: "en" | "tr", gender: NameGender = "unisex"): string[] {
  const data = language === "tr" ? trNameData : enNameData
  const firsts =
    gender === "male" ? data.maleNames : gender === "female" ? data.femaleNames : [...data.maleNames, ...data.femaleNames]
  const pool: string[] = []
  for (const first of firsts) {
    for (const last of data.lastNames) {
      pool.push(`${first} ${last}`)
    }
  }
  return pool
}

/** 2000 consecutive dates starting today, formatted in local time (no UTC day-shift). */
export function datePool(): string[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 2 * MAX_COUNT }, (_, i) => {
    const d = new Date(today.getTime() + i * 86400000)
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${month}-${day}`
  })
}

/** Dile göre üretim havuzu: yalnızca harf+rakam karışık şifreler (tek kelimeler elenmiş). */
export function passwordPool(language: "en" | "tr"): string[] {
  return [...(language === "tr" ? trPasswordData : enPasswordData).mixed]
}

/** Unique passwords: shuffled pool first, then pool-based suffixed variants if n exceeds the pool. */
export function uniquePasswords(n: number, language: "en" | "tr"): string[] {
  const pool = passwordPool(language)
  const values = takeUnique(pool, n)
  if (values.length >= n) return values
  const seen = new Set(values)
  let guard = 0
  while (values.length < n && guard < n * 50 + 50) {
    guard += 1
    const candidate = `${pool[Math.floor(Math.random() * pool.length)]}-${randomDigits(6)}`
    if (seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }
  // Practically unreachable: index-suffixed fallback is unique by construction.
  while (values.length < n) {
    values.push(`${pool[values.length % pool.length]}-x${values.length}-${randomDigits(6)}`)
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

function randomIndex(bound: number): number {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function" && bound > 0) {
    const array = new Uint32Array(1)
    // Rejection sampling to avoid modulo bias.
    const limit = Math.floor(0x1_0000_0000 / bound) * bound
    let value = 0
    do {
      cryptoObj.getRandomValues(array)
      value = array[0]
    } while (value >= limit)
    return value % bound
  }
  return Math.floor(Math.random() * bound)
}

/**
 * Fully-random password: pure charset sampling, no words, no language dependence.
 * Guarantees at least one char from each enabled set when length allows it.
 */
export function generateRandomPassword(
  length: number,
  options: RandomPasswordOptions = DEFAULT_RANDOM_PASSWORD_OPTIONS,
): string {
  const safeLength = clampPasswordLength(length)
  const charset = buildPasswordCharset(options)
  const chars: string[] = Array.from({ length: safeLength }, () => charset[randomIndex(charset.length)])

  const required: string[] = []
  if (options.lowercase) required.push(LOWER_CHARS[randomIndex(LOWER_CHARS.length)])
  if (options.uppercase) required.push(UPPER_CHARS[randomIndex(UPPER_CHARS.length)])
  if (options.digits) required.push(DIGIT_CHARS[randomIndex(DIGIT_CHARS.length)])
  if (options.symbols) required.push(SYMBOL_CHARS[randomIndex(SYMBOL_CHARS.length)])

  // No charset selected -> charset already fell back to lowercase, nothing to force.
  const enabledSets = required.length
  if (enabledSets === 0 || safeLength < enabledSets) return chars.join("")

  const positions = new Set<number>()
  for (const char of required) {
    let pos = randomIndex(safeLength)
    while (positions.has(pos)) pos = randomIndex(safeLength)
    positions.add(pos)
    chars[pos] = char
  }
  return chars.join("")
}

/** Unique fully-random passwords via retry-with-set (effectively infinite space). */
export function generateRandomPasswords(
  n: number,
  options: RandomPasswordOptions = DEFAULT_RANDOM_PASSWORD_OPTIONS,
): string[] {
  const safeN = Math.min(MAX_COUNT, Math.max(1, Math.floor(n) || 1))
  const safeLength = clampPasswordLength(options.length)
  const seen = new Set<string>()
  const values: string[] = []
  let attempts = 0
  while (values.length < safeN && attempts < safeN * 20 + 20) {
    attempts += 1
    const candidate = generateRandomPassword(safeLength, options)
    if (seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }
  while (values.length < safeN) {
    values.push(generateRandomPassword(safeLength, { ...options, length: safeLength }))
  }
  return values
}

/** Fisher-Yates shuffle + take: strict sampling without replacement. */
export function takeUnique<T>(pool: T[], n: number): T[] {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
}

export function generateTCKN() {
  // TCKN is formed from nine random digits and two check digits.
  // The first digit cannot be zero.
  const digits = [Math.floor(Math.random() * 9) + 1, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))]
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  const tenthDigit = ((oddSum * 7 - evenSum) % 10 + 10) % 10
  const eleventhDigit = digits.reduce((sum, digit) => sum + digit, 0) + tenthDigit

  return [...digits, tenthDigit, eleventhDigit % 10].join("")
}

function generateValue(type: Exclude<DataType, "fullName" | "date" | "password">, phoneCountryCode = "US"): string {
  switch (type) {
    case "email": return `user${randomDigits(8)}@example.com`
    case "address": return `${Math.floor(Math.random() * 900) + 100} ${["Main", "Oak", "Pine", "Cedar"][Math.floor(Math.random() * 4)]} Street, New York, NY`
    case "phone": return generatePhoneNumber(getPhoneCountry(phoneCountryCode, "US"))
    case "uuid": return crypto.randomUUID()
    case "tckn": return generateTCKN()
    case "username": return `user${randomDigits(8)}`
  }
}

export function MiscGenerator({ onCopy, language }: Props) {
  const copy = labels[language]
  const [type, setType] = useState<DataType>("fullName")
  const [count, setCount] = useState(1)
  const [format, setFormat] = useState<OutputFormat>("text")
  const [phoneCountryCode, setPhoneCountryCode] = useState("US")
  const [nameGender, setNameGender] = useState<NameGender>("unisex")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json")
  const [passwordSource, setPasswordSource] = useState<PasswordSource>("wordlist")
  const [randomPasswordOptions, setRandomPasswordOptions] = useState<RandomPasswordOptions>(
    DEFAULT_RANDOM_PASSWORD_OPTIONS,
  )
  const [exportRows, setExportRows] = useState<ExportRow[]>(() => [
    { id: crypto.randomUUID(), value: takeUnique(fullNamePool(language), 1)[0] },
  ])
  const [value, setValue] = useState(() => exportRows[0].value)

  const formatRows = (rows: ExportRow[], outputFormat: OutputFormat) => {
    if (outputFormat === "json") return formatJson(rows, false)
    if (outputFormat === "jsonWithId") return formatJson(rows, true)
    if (outputFormat === "csv") return formatCsv(rows, false)
    if (outputFormat === "csvWithId") return formatCsv(rows, true)
    return rows.map((row) => row.value).join("\n")
  }

  const generate = (
    nextType = type,
    nextFormat = format,
    nextPhoneCountryCode = phoneCountryCode,
    nextNameGender = nameGender,
    nextPasswordSource = passwordSource,
    nextRandomPasswordOptions = randomPasswordOptions,
  ) => {
    const safeCount = Math.min(MAX_COUNT, Math.max(1, Math.floor(count) || 1))
    setCount(safeCount)
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
    const rows: ExportRow[] = values.map((item) => ({ id: crypto.randomUUID(), value: item }))
    setExportRows(rows)
    setValue(formatRows(rows, nextFormat))
  }
  const copyValue = async () => {
    await navigator.clipboard.writeText(value)
    onCopy(copy.copied)
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
    onCopy(isJson ? copy.exportedJson : copy.exportedCsv)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{copy.count}</span>
          <input
            className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            type="number"
            min={1}
            max={MAX_COUNT}
            step={1}
            value={count}
            onChange={(event) => setCount(Math.min(MAX_COUNT, Math.max(1, Number(event.target.value) || 1)))}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{copy.format}</span>
          <Select value={format} onValueChange={(next) => {
        reformat(next as OutputFormat)
      }}>
            <SelectTrigger aria-label={copy.format}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">{copy.plainText}</SelectItem>
              <SelectItem value="json">{copy.json}</SelectItem>
              <SelectItem value="jsonWithId">{copy.jsonWithId}</SelectItem>
              <SelectItem value="csv">{copy.csv}</SelectItem>
              <SelectItem value="csvWithId">{copy.csvWithId}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <Select value={type} onValueChange={(next) => {
        const nextType = next as DataType
        setType(nextType)
        generate(nextType, format)
      }}>
        <SelectTrigger aria-label={copy.select}>
          <SelectValue placeholder={copy.select} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fullName">{copy.fullName}</SelectItem>
          <SelectItem value="email">{copy.email}</SelectItem>
          <SelectItem value="address">{copy.address}</SelectItem>
          <SelectItem value="password">{copy.password}</SelectItem>
          <SelectItem value="phone">{copy.phone}</SelectItem>
          <SelectItem value="uuid">{copy.uuid}</SelectItem>
          <SelectItem value="date">{copy.date}</SelectItem>
          <SelectItem value="tckn">{copy.tckn}</SelectItem>
          <SelectItem value="username">{copy.username}</SelectItem>
        </SelectContent>
      </Select>
      {type === "fullName" && (
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{copy.gender}</span>
          <Select value={nameGender} onValueChange={(next) => {
            const nextGender = next as NameGender
            setNameGender(nextGender)
            generate("fullName", format, phoneCountryCode, nextGender)
          }}>
            <SelectTrigger aria-label={copy.gender}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{copy.man}</SelectItem>
              <SelectItem value="female">{copy.woman}</SelectItem>
              <SelectItem value="unisex">{copy.unisex}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      )}
      {type === "password" && (
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>{copy.passwordSource}</span>
            <Select value={passwordSource} onValueChange={(next) => {
              const nextSource = next as PasswordSource
              setPasswordSource(nextSource)
              generate("password", format, phoneCountryCode, nameGender, nextSource, randomPasswordOptions)
            }}>
              <SelectTrigger aria-label={copy.passwordSource}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wordlist">{copy.wordlist}</SelectItem>
                <SelectItem value="random">{copy.fullyRandom}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {passwordSource === "random" && (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>{copy.passwordLength}</span>
                <input
                  className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                  type="number"
                  min={RANDOM_PASSWORD_MIN_LENGTH}
                  max={RANDOM_PASSWORD_MAX_LENGTH}
                  step={1}
                  value={randomPasswordOptions.length}
                  aria-label={copy.passwordLength}
                  onChange={(event) => {
                    const nextOptions = {
                      ...randomPasswordOptions,
                      length: clampPasswordLength(Number(event.target.value)),
                    }
                    setRandomPasswordOptions(nextOptions)
                    generate("password", format, phoneCountryCode, nameGender, "random", nextOptions)
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "lowercase" as const, label: copy.lowercase },
                    { key: "uppercase" as const, label: copy.uppercase },
                    { key: "digits" as const, label: copy.digits },
                    { key: "symbols" as const, label: copy.symbols },
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
          <span>{copy.country}</span>
          <Select value={phoneCountryCode} onValueChange={(next) => {
            setPhoneCountryCode(next)
            generate("phone", format, next)
          }}>
            <SelectTrigger aria-label={copy.country}><SelectValue /></SelectTrigger>
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
        <Button type="button" onClick={() => generate()}>{copy.generate}</Button>
        <Button type="button" variant="outline" onClick={copyValue}>{copy.copy}</Button>
      </div>
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>{copy.exportFormat}</span>
          <Select value={exportFormat} onValueChange={(next) => setExportFormat(next as ExportFormat)}>
            <SelectTrigger aria-label={copy.exportFormat}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">{copy.json}</SelectItem>
              <SelectItem value="jsonWithId">{copy.jsonWithId}</SelectItem>
              <SelectItem value="csv">{copy.csv}</SelectItem>
              <SelectItem value="csvWithId">{copy.csvWithId}</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Button type="button" variant="outline" onClick={exportFile}>{copy.export}</Button>
      </div>
    </div>
  )
}

