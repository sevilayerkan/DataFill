"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buildEmailLocal,
  generateAddressValue,
  generateCompanyName,
  generateJobTitle,
  generatePhoneValue,
  pickPersonaIdentity,
  takeUnique,
  passwordPool,
  uniquePasswords,
} from "@/components/MiscGenerator"
import { emailData as enEmailData } from "@/data/en/email-data"
import { emailData as trEmailData } from "@/data/tr/email-data"
import { copyTextToClipboard } from "@/lib/clipboard"
import { downloadTextFile, buildExportFilename, escapeCsvField } from "@/lib/export"
import { parseNumericDraft } from "@/lib/numeric-input"
import { randomInt, randomUUID, type RandomSource } from "@/lib/random"
import { useTranslation } from "@/hooks/useTranslation"

export type PersonaField =
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "password"
  | "uuid"
  | "company"
  | "jobTitle"
export const PERSONA_FIELDS: readonly PersonaField[] = [
  "fullName",
  "email",
  "phone",
  "address",
  "password",
  "uuid",
  "company",
  "jobTitle",
]
export type DatasetFormat = "json" | "csv" | "sql"
export type Persona = Record<PersonaField, string>

const MAX_COUNT = 1000
const SQL_TABLE = "users"
const SQL_COLUMNS: Record<PersonaField, string> = {
  fullName: "full_name",
  email: "email",
  phone: "phone",
  address: "address",
  password: "password",
  uuid: "uuid",
  company: "company",
  jobTitle: "job_title",
}

/**
 * One consistent persona: a single shared identity backs `fullName` and
 * `email`, so the bundle reads like one user instead of six loose values.
 * Pass `password` to assign unique passwords from a batch; otherwise one is sampled.
 */
export function buildPersona(
  language: "en" | "tr",
  phoneCountryCode: string,
  password?: string,
  rand?: RandomSource,
): Persona {
  const identity = pickPersonaIdentity(language, rand)
  const domains = language === "tr" ? trEmailData.domains : enEmailData.domains
  return {
    fullName: identity.display,
    email: `${buildEmailLocal(identity.first, identity.last, rand)}@${domains[randomInt(domains.length, rand)]}`,
    phone: generatePhoneValue(phoneCountryCode, rand),
    address: generateAddressValue(language, rand),
    password: password ?? takeUnique(passwordPool(language), 1, rand)[0],
    uuid: randomUUID(),
    company: generateCompanyName(language, rand),
    jobTitle: generateJobTitle(language, rand),
  }
}

/** SQL string literal escaping: single quotes are doubled. */
export function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Render personas in the selected shape, restricted to the checked fields
 * (in `PERSONA_FIELDS` order): a JSON array, an RFC-4180 CSV, or a single
 * multi-row `INSERT INTO users …` statement.
 */
export function formatPersonas(personas: Persona[], fields: readonly PersonaField[], format: DatasetFormat): string {
  const selected = PERSONA_FIELDS.filter((field) => fields.includes(field))
  if (format === "json") {
    return JSON.stringify(
      personas.map((persona) => Object.fromEntries(selected.map((field) => [field, persona[field]]))),
      null,
      2,
    )
  }
  if (format === "csv") {
    const lines = [selected.join(",")]
    for (const persona of personas) {
      lines.push(selected.map((field) => escapeCsvField(persona[field])).join(","))
    }
    return lines.join("\n")
  }
  if (selected.length === 0) return ""
  const columns = selected.map((field) => SQL_COLUMNS[field]).join(", ")
  const rows = personas
    .map((persona) => `(${selected.map((field) => escapeSqlString(persona[field])).join(", ")})`)
    .join(",\n")
  return `INSERT INTO ${SQL_TABLE} (${columns}) VALUES\n${rows};`
}

type Props = {
  onCopy: (message: string) => void
  language: "en" | "tr"
}

export function DatasetBuilder({ onCopy, language }: Props) {
  const { t } = useTranslation(language)
  const [count, setCount] = useState(10)
  const [countDraft, setCountDraft] = useState("10")
  const [format, setFormat] = useState<DatasetFormat>("json")
  const [fields, setFields] = useState<PersonaField[]>([...PERSONA_FIELDS])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [value, setValue] = useState("")
  const phoneCountryCode = language === "tr" ? "TR" : "US"

  const fieldLabel: Record<PersonaField, string> = {
    fullName: t("miscFullName"),
    email: t("miscEmail"),
    phone: t("miscPhone"),
    address: t("miscAddress"),
    password: t("miscPassword"),
    uuid: t("miscUuid"),
    company: t("miscCompany"),
    jobTitle: t("miscJobTitle"),
  }

  /** Normalize the count draft into state; returns the effective count. */
  const commitCount = (): number => {
    const parsed = parseNumericDraft(countDraft)
    if (parsed === null) {
      setCountDraft(String(count))
      return count
    }
    const safeCount = Math.min(MAX_COUNT, Math.max(1, Math.floor(parsed)))
    setCount(safeCount)
    setCountDraft(String(safeCount))
    return safeCount
  }

  const generate = (nextFields = fields, nextFormat = format) => {
    const safeCount = commitCount()
    const passwords = uniquePasswords(safeCount, language)
    const rows = Array.from({ length: safeCount }, (_, i) => buildPersona(language, phoneCountryCode, passwords[i]))
    setPersonas(rows)
    setValue(formatPersonas(rows, nextFields, nextFormat))
  }

  const toggleField = (field: PersonaField, checked: boolean) => {
    const next = checked ? [...fields, field] : fields.filter((f) => f !== field)
    const ordered = PERSONA_FIELDS.filter((f) => next.includes(f))
    setFields(ordered)
    if (personas.length > 0) setValue(formatPersonas(personas, ordered, format))
  }

  const reformat = (nextFormat: DatasetFormat) => {
    setFormat(nextFormat)
    setValue(formatPersonas(personas, fields, nextFormat))
  }

  const copyValue = async () => {
    const ok = await copyTextToClipboard(value)
    onCopy(ok ? t("miscCopied") : t("copyFailed"))
  }

  const exportFile = () => {
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "application/sql"
    downloadTextFile(buildExportFilename(`fadelytext-dataset-${personas.length}`, format), value, mime)
    onCopy(t(format === "json" ? "miscExportedJson" : format === "csv" ? "miscExportedCsv" : "miscExportedSql"))
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
            reformat(next as DatasetFormat)
          }}>
            <SelectTrigger aria-label={t("miscFormat")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">{t("miscJson")}</SelectItem>
              <SelectItem value="csv">{t("miscCsv")}</SelectItem>
              <SelectItem value="sql">{t("miscSql")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <fieldset className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium">{t("datasetFields")}</legend>
        {PERSONA_FIELDS.map((field) => (
          <label key={field} className="flex items-center gap-2 text-sm font-normal">
            <Checkbox
              checked={fields.includes(field)}
              aria-label={fieldLabel[field]}
              onCheckedChange={(checked) => toggleField(field, checked === true)}
            />
            <span>{fieldLabel[field]}</span>
          </label>
        ))}
      </fieldset>
      <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm whitespace-pre-wrap break-all" aria-live="polite">{value}</pre>
      <div className="flex gap-2">
        <Button type="button" onClick={() => generate()} disabled={fields.length === 0}>{t("miscGenerate")}</Button>
        <Button type="button" variant="outline" onClick={copyValue}>{t("miscCopy")}</Button>
        <Button type="button" variant="outline" onClick={exportFile}>{t("miscExport")}</Button>
      </div>
    </div>
  )
}
