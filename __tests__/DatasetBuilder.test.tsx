import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import {
  DatasetBuilder,
  buildPersona,
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
    { fullName: "John Smith", email: "john.smith@gmail.com", phone: "+11234567890", address: "1 Main St, NY", password: "pw-1", uuid: "u1" },
    { fullName: "Ayşe Yılmaz", email: "ayse.yilmaz@gmail.com", phone: "0532 111 22 33", address: "O'Brien Mah., No: 5", password: "pw-2", uuid: "u2" },
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
