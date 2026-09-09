import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import {
  DatasetBuilder,
  buildPersona,
  escapeSqlString,
  formatPersonas,
  PERSONA_FIELDS,
  type Persona,
} from "../components/DatasetBuilder"
import { buildEmailLocal, buildUsernameHandle, pickPersonaIdentity } from "../components/MiscGenerator"

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

function outputText(): string {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? ""
}

describe("persona consistency", () => {
  it("derives email and username from the same identity", () => {
    for (const language of ["en", "tr"] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const identity = pickPersonaIdentity(language, lcg(seed))
        const local = buildEmailLocal(identity.first, identity.last, lcg(seed))
        const handle = buildUsernameHandle(identity.first, identity.last, lcg(seed))
        expect(local).toMatch(/^[a-z0-9._-]+$/)
        expect(local.includes(identity.first) || local.includes(identity.last)).toBe(true)
        expect(handle.includes(identity.first) || handle.includes(identity.last)).toBe(true)
      }
    }
  })

  it("builds complete personas with valid shapes", () => {
    const persona = buildPersona("en", "US", "secret-1", lcg(4))
    expect(Object.keys(persona).sort()).toEqual([...PERSONA_FIELDS].sort())
    expect(persona.email).toMatch(/^[a-z0-9._-]+@[a-z.]+\.[a-z]+$/)
    expect(persona.phone).toMatch(/^\+1\d{10}$/)
    expect(persona.password).toBe("secret-1")
    expect(persona.uuid).toMatch(/^[0-9a-f-]{36}$/)
    expect(buildPersona("tr", "TR", undefined, lcg(4)).phone).toMatch(/^05\d{2} \d{3} \d{2} \d{2}$/)
  })
})

describe("formatPersonas", () => {
  const rows: Persona[] = [
    { fullName: "John Smith", email: "john.smith@gmail.com", phone: "+11234567890", address: "1 Main St, NY", password: "pw-1", uuid: "u1", company: "Acme Labs", jobTitle: "Software Engineer" },
    { fullName: "Ayşe Yılmaz", email: "ayse.yilmaz@gmail.com", phone: "0532 111 22 33", address: "O'Brien Mah., No: 5", password: "pw-2", uuid: "u2", company: "Anadolu Bilişim", jobTitle: "Yazılım Mühendisi" },
  ]

  it("emits a JSON array restricted to the checked fields", () => {
    const parsed = JSON.parse(formatPersonas(rows, ["fullName", "email"], "json"))
    expect(parsed).toEqual([
      { fullName: "John Smith", email: "john.smith@gmail.com" },
      { fullName: "Ayşe Yılmaz", email: "ayse.yilmaz@gmail.com" },
    ])
  })

  it("emits RFC-4180 CSV with quoting", () => {
    const csv = formatPersonas(rows, ["fullName", "address"], "csv")
    const lines = csv.split("\n")
    expect(lines[0]).toBe("fullName,address")
    expect(lines[1]).toBe("John Smith,\"1 Main St, NY\"")
    expect(lines[2]).toBe("Ayşe Yılmaz,\"O'Brien Mah., No: 5\"")
  })

  it("emits a single multi-row INSERT with doubled quotes", () => {
    const sql = formatPersonas(rows, ["fullName", "address"], "sql")
    expect(sql).toMatch(/^INSERT INTO users \(full_name, address\) VALUES\n/)
    expect(sql.endsWith(";")).toBe(true)
    expect(sql).toContain("O''Brien Mah., No: 5")
    expect(sql.split("),\n").length).toBe(2)
  })

  it("renders empty field sets without crashing", () => {
    expect(JSON.parse(formatPersonas(rows, [], "json"))).toEqual([{}, {}])
    expect(formatPersonas(rows, [], "csv")).toBe("\n\n")
    expect(formatPersonas(rows, [], "sql")).toBe("")
  })

  it("escapes SQL string literals by doubling quotes", () => {
    expect(escapeSqlString("O'Brien")).toBe("'O''Brien'")
    expect(escapeSqlString("plain")).toBe("'plain'")
    expect(escapeSqlString("")).toBe("''")
  })
})

describe("DatasetBuilder component", () => {
  it("generates consistent persona rows on demand", () => {
    render(<DatasetBuilder onCopy={vi.fn()} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    const parsed = JSON.parse(outputText())
    expect(parsed.length).toBe(10)
    for (const row of parsed) {
      expect(row.email).toMatch(/@/)
      expect(Object.keys(row).sort()).toEqual([...PERSONA_FIELDS].sort())
    }
  })

  it("drops unchecked fields from the output", () => {
    render(<DatasetBuilder onCopy={vi.fn()} language="en" />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Email" }))
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    const parsed = JSON.parse(outputText())
    expect(parsed.length).toBe(10)
    for (const row of parsed) {
      expect(row).not.toHaveProperty("email")
      expect(row).toHaveProperty("fullName")
    }
  })

  it("renders the Turkish tab labels", () => {
    render(<DatasetBuilder onCopy={vi.fn()} language="tr" />)
    expect(screen.getByRole("button", { name: "Üret" })).toBeInTheDocument()
    expect(screen.getByText("Alanlar")).toBeInTheDocument()
  })
})

describe("DatasetBuilder formats/export", () => {
  const mockOnCopy = vi.fn()
  let createObjectURL: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let origCreate: typeof URL.createObjectURL | undefined

  function selectFormat(name: string) {
    fireEvent.click(screen.getByRole("combobox", { name: "Format" }))
    fireEvent.click(screen.getByRole("option", { name }))
  }

  beforeEach(() => {
    mockOnCopy.mockClear()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    origCreate = URL.createObjectURL
    createObjectURL = vi.fn((_obj: Blob | MediaSource) => "blob:mock-url")
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    clickSpy.mockRestore()
    if (origCreate) URL.createObjectURL = origCreate
    else delete (URL as unknown as Record<string, unknown>).createObjectURL
    document.body.innerHTML = ""
  })

  it("reformats to CSV and SQL via the Select", () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    selectFormat("CSV")
    expect(outputText().split("\n")[0]).toBe(
      "fullName,email,phone,address,password,uuid,company,jobTitle",
    )

    selectFormat("SQL")
    expect(outputText()).toMatch(/^INSERT INTO users \(full_name, email, /)
  })

  it("updates the output when a field is toggled after generating", () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(JSON.parse(outputText())[0]).toHaveProperty("email")

    fireEvent.click(screen.getByRole("checkbox", { name: "Email" }))
    const parsed = JSON.parse(outputText())
    expect(parsed).toHaveLength(10)
    for (const row of parsed) {
      expect(row).not.toHaveProperty("email")
      expect(row).toHaveProperty("fullName")
    }
  })

  it("copies the generated value", async () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Copied to clipboard!"))
  })

  it("exports JSON, CSV and SQL files", async () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const downloadOf = (): string => {
      const appendSpy = vi.spyOn(document.body, "appendChild")
      fireEvent.click(screen.getByRole("button", { name: "Export" }))
      const anchor = appendSpy.mock.calls
        .map(([node]) => node)
        .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
      appendSpy.mockRestore()
      expect(anchor).toBeDefined()
      return anchor!.download
    }

    expect(downloadOf()).toMatch(/\.json$/)
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Exported JSON file!"))

    selectFormat("CSV")
    expect(downloadOf()).toMatch(/\.csv$/)
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Exported CSV file!"))

    selectFormat("SQL")
    expect(downloadOf()).toMatch(/\.sql$/)
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Exported SQL file!"))
  })

  it("caps the count at 1000 and keeps the last count when cleared", () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    const count = screen.getByRole("spinbutton") as HTMLInputElement

    fireEvent.change(count, { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(JSON.parse(outputText())).toHaveLength(3)

    fireEvent.change(count, { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(JSON.parse(outputText())).toHaveLength(1000)

    fireEvent.change(count, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    expect(JSON.parse(outputText())).toHaveLength(1000)
    expect(count.value).toBe("1000")

    fireEvent.change(count, { target: { value: "" } })
    fireEvent.blur(count)
    expect(count.value).toBe("1000")
  })

  it("disables Generate when every field is unchecked", () => {
    render(<DatasetBuilder onCopy={mockOnCopy} language="en" />)
    const generate = screen.getByRole("button", { name: "Generate" })
    expect(generate).toBeEnabled()

    for (const field of ["Full Name", "Email", "Phone", "Address", "Password", "UUID", "Company", "Job Title"]) {
      fireEvent.click(screen.getByRole("checkbox", { name: field }))
    }
    expect(generate).toBeDisabled()
  })
})
