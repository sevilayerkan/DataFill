import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  escapeCsvField,
  formatJson,
  formatCsv,
  buildExportFilename,
  downloadTextFile,
  type ExportRow,
} from "../lib/export"

const rows: ExportRow[] = [
  { id: "1", value: "John Smith" },
  { id: "2", value: "Ayşe Yılmaz" },
]

describe("escapeCsvField", () => {
  it("leaves plain fields untouched", () => {
    expect(escapeCsvField("hello")).toBe("hello")
    expect(escapeCsvField("")).toBe("")
    expect(escapeCsvField("O'Brien Mah.")).toBe("O'Brien Mah.")
  })

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("1 Main St, NY")).toBe('"1 Main St, NY"')
  })

  it("doubles embedded quotes and wraps in quotes", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it("quotes fields containing LF or CR", () => {
    expect(escapeCsvField("a\nb")).toBe('"a\nb"')
    expect(escapeCsvField("a\rb")).toBe('"a\rb"')
    expect(escapeCsvField("a\r\nb")).toBe('"a\r\nb"')
  })

  it("handles combined comma + quote + newline", () => {
    expect(escapeCsvField('a,"b\nc')).toBe('"a,""b\nc"')
  })
})

describe("formatJson", () => {
  it("emits values-only array without ids", () => {
    expect(JSON.parse(formatJson(rows, false))).toEqual(["John Smith", "Ayşe Yılmaz"])
  })

  it("emits id/value objects with ids", () => {
    expect(JSON.parse(formatJson(rows, true))).toEqual([
      { id: "1", value: "John Smith" },
      { id: "2", value: "Ayşe Yılmaz" },
    ])
  })

  it("emits an empty array for no rows", () => {
    expect(formatJson([], false)).toBe("[]")
    expect(formatJson([], true)).toBe("[]")
  })

  it("pretty-prints with 2-space indent", () => {
    expect(formatJson([{ id: "1", value: "a" }], false)).toBe('[\n  "a"\n]')
  })

  it("preserves unicode without escaping", () => {
    expect(formatJson(rows, false)).toContain("Ayşe Yılmaz")
  })
})

describe("formatCsv", () => {
  it("emits a bare value header without ids", () => {
    expect(formatCsv(rows, false)).toBe("value\nJohn Smith\nAyşe Yılmaz")
  })

  it("emits id,value header with ids", () => {
    expect(formatCsv(rows, true)).toBe("id,value\n1,John Smith\n2,Ayşe Yılmaz")
  })

  it("emits only the header for no rows", () => {
    expect(formatCsv([], false)).toBe("value")
    expect(formatCsv([], true)).toBe("id,value")
  })

  it("quotes values with commas", () => {
    const out = formatCsv([{ id: "1", value: "1 Main St, NY" }], false)
    expect(out).toBe('value\n"1 Main St, NY"')
  })

  it("doubles quotes inside values", () => {
    const out = formatCsv([{ id: "1", value: 'say "hi"' }], true)
    expect(out).toBe('id,value\n1,"say ""hi"""')
  })

  it("quotes values with newlines", () => {
    const out = formatCsv([{ id: "7", value: "line1\nline2" }], false)
    expect(out).toBe('value\n"line1\nline2"')
  })
})

describe("buildExportFilename", () => {
  it("appends the extension to a clean base", () => {
    expect(buildExportFilename("datafill-names-10", "json")).toBe("datafill-names-10.json")
    expect(buildExportFilename("data", "csv")).toBe("data.csv")
    expect(buildExportFilename("data", "sql")).toBe("data.sql")
  })

  it("replaces spaces and special chars with dashes", () => {
    expect(buildExportFilename("my dataset!", "csv")).toBe("my-dataset.csv")
    expect(buildExportFilename("a/b\\c", "json")).toBe("a-b-c.json")
  })

  it("trims leading/trailing dashes", () => {
    expect(buildExportFilename("  hello  ", "json")).toBe("hello.json")
    expect(buildExportFilename("!!a!!", "csv")).toBe("a.csv")
  })

  it("falls back to export for empty/uncleanable bases", () => {
    expect(buildExportFilename("", "json")).toBe("export.json")
    expect(buildExportFilename("!!!", "csv")).toBe("export.csv")
  })

  it("matches the real caller shape", () => {
    expect(buildExportFilename("datafill-john-5", "json")).toBe("datafill-john-5.json")
  })
})

describe("downloadTextFile", () => {
  let createObjectURL: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let origCreate: typeof URL.createObjectURL | undefined
  let origRevoke: typeof URL.revokeObjectURL | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    origCreate = URL.createObjectURL
    origRevoke = URL.revokeObjectURL
    createObjectURL = vi.fn(() => "blob:mock-url")
    revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    // jsdom would otherwise attempt navigation on anchor.click().
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    clickSpy.mockRestore()
    vi.useRealTimers()
    if (origCreate) URL.createObjectURL = origCreate
    else delete (URL as unknown as Record<string, unknown>).createObjectURL
    if (origRevoke) URL.revokeObjectURL = origRevoke
    else delete (URL as unknown as Record<string, unknown>).revokeObjectURL
    document.body.innerHTML = ""
  })

  it("creates a UTF-8 blob with the given content and mime", () => {
    // Capture exact Blob constructor input (parts + type).
    const RealBlob = globalThis.Blob
    const seen: { parts: BlobPart[]; options?: BlobPropertyBag }[] = []
    vi.stubGlobal(
      "Blob",
      class extends RealBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options)
          seen.push({ parts, options })
        }
      },
    )
    try {
      downloadTextFile("f.txt", "hello", "text/plain")
    } finally {
      vi.unstubAllGlobals()
    }

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(RealBlob)
    expect(seen).toHaveLength(1)
    expect(seen[0].parts).toEqual(["hello"])
    expect(seen[0].options).toEqual({ type: "text/plain;charset=utf-8" })
  })

  it("wires the anchor (href/download), clicks, and detaches it", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild")

    downloadTextFile("data.csv", "a,b", "text/csv")

    expect(clickSpy).toHaveBeenCalledOnce()
    const anchor = appendSpy.mock.calls
      .map(([node]) => node)
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
    expect(anchor).toBeDefined()
    expect(anchor!.download).toBe("data.csv")
    expect(anchor!.getAttribute("href")).toBe("blob:mock-url")
    // Removed after click so repeated exports don't leak nodes.
    expect(document.body.contains(anchor!)).toBe(false)
    appendSpy.mockRestore()
  })

  it("revokes the object URL after 1000ms, not before", () => {
    downloadTextFile("f.json", "[]", "application/json")

    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(999)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
  })
})
