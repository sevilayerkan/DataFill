export interface ExportRow {
  id: string
  value: string
}

/** RFC 4180 field escaping: quote when field contains `"`, `,`, `\n` or `\r`. */
export function escapeCsvField(field: string): string {
  if (/["\n\r,]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function formatJson(rows: ExportRow[], withId: boolean): string {
  if (withId) {
    return JSON.stringify(rows.map(({ id, value }) => ({ id, value })), null, 2)
  }
  return JSON.stringify(rows.map((row) => row.value), null, 2)
}

export function formatCsv(rows: ExportRow[], withId: boolean): string {
  const lines: string[] = [withId ? "id,value" : "value"]
  for (const row of rows) {
    lines.push(
      withId
        ? `${escapeCsvField(row.id)},${escapeCsvField(row.value)}`
        : escapeCsvField(row.value),
    )
  }
  return lines.join("\n")
}

export function buildExportFilename(base: string, ext: "json" | "csv"): string {
  const safeBase = base.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "export"
  return `${safeBase}.${ext}`
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke async so the download has time to start (Firefox needs the delay).
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
