import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MiscGenerator, datePool, fullNamePool, takeUnique, parseMiscUrlParams, buildMiscUrlParams, buildMiscValues } from "../components/MiscGenerator"
import { nameData as enNameData } from "../data/en/name-data"
import { nameData as trNameData } from "../data/tr/name-data"

function getOutputLines(): string[] {
  const output = document.querySelector('[aria-live="polite"]')
  return (output?.textContent ?? "").split("\n").filter(Boolean)
}

describe("MiscGenerator", () => {
  beforeEach(() => {
    // generate() syncs settings into the address bar (share links):
    // reset it so URL-restored state never leaks between tests.
    window.history.replaceState(null, "", "/")
  })

  it("does not mangle values when count exceeds the pool size", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(5)
    // Regression: colliding full names used to get "-4" / "-5" suffixes.
    for (const line of lines) {
      expect(line).not.toMatch(/-\d+$/)
    }
  })

  it("emits unique values while the pool allows it", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(4)
    expect(new Set(lines).size).toBe(4)
  })

  it("keeps 200 full names unique (combinatorial pool)", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "200" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(200)
    expect(new Set(lines).size).toBe(200)
  })

  it("keeps 500 dates unique and well-formed", () => {
    // NOTE: the data-type Select is Radix-based and doesn't activate on
    // synthetic jsdom clicks, so the date pool is exercised directly here.
    const dates = takeUnique(datePool(), 500)
    expect(dates).toHaveLength(500)
    expect(new Set(dates).size).toBe(500)
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("holds at least 1000 combinations per language", () => {
    expect(fullNamePool("en").length).toBeGreaterThanOrEqual(1000)
    expect(fullNamePool("tr").length).toBeGreaterThanOrEqual(1000)
  })

  it("keeps 1000 Turkish full names unique", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="tr" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1000" } })
    fireEvent.click(screen.getByRole("button", { name: "Üret" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(1000)
    expect(new Set(lines).size).toBe(1000)
  })

  it("keeps the last count when the count input is cleared", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    const countInput = screen.getByRole("spinbutton") as HTMLInputElement

    // Clearing the field must not push 0/NaN into state: Generate falls back
    // to the last committed count and restores the field.
    fireEvent.change(countInput, { target: { value: "" } })
    expect(countInput.value).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    expect(getOutputLines()).toHaveLength(1)
    expect(countInput.value).toBe("1")
  })
})

describe("MiscGenerator name gender selection", () => {
  it("builds male-only and female-only pools", () => {
    for (const first of fullNamePool("en", "male").map((n) => n.split(" ")[0])) {
      expect(enNameData.maleNames).toContain(first)
    }
    for (const first of fullNamePool("en", "female").map((n) => n.split(" ")[0])) {
      expect(enNameData.femaleNames).toContain(first)
    }
    expect(fullNamePool("en", "male").length).toBe(enNameData.maleNames.length * enNameData.lastNames.length)
    expect(fullNamePool("en", "female").length).toBe(enNameData.femaleNames.length * enNameData.lastNames.length)
  })

  it("defaults to a unisex pool combining both genders", () => {
    const unisex = fullNamePool("en", "all")
    const implicit = fullNamePool("en")
    expect(unisex).toEqual(implicit)
    expect(unisex.length).toBe(
      (enNameData.maleNames.length + enNameData.femaleNames.length) * enNameData.lastNames.length,
    )
    const firsts = new Set(unisex.map((n) => n.split(" ")[0]))
    expect(firsts.has(enNameData.maleNames[0])).toBe(true)
    expect(firsts.has(enNameData.femaleNames[0])).toBe(true)
  })

  it("filters Turkish pools by gender too", () => {
    for (const first of fullNamePool("tr", "male").map((n) => n.split(" ")[0])) {
      expect(trNameData.maleNames).toContain(first)
    }
    for (const first of fullNamePool("tr", "female").map((n) => n.split(" ")[0])) {
      expect(trNameData.femaleNames).toContain(first)
    }
  })

  it("shows Man/Woman/All options for the full-name type", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.click(screen.getByRole("combobox", { name: "Gender" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["Man", "Woman", "All"])
  })

  it("shows localized gender options in Turkish", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="tr" />)
    fireEvent.click(screen.getByRole("combobox", { name: "Cinsiyet" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["Erkek", "Kadın", "Tümü"])
  })

  it("generates only male first names when Man is selected", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("combobox", { name: "Gender" }))
    fireEvent.click(screen.getByText("Man"))
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(10)
    for (const line of lines) {
      expect(enNameData.maleNames).toContain(line.split(" ")[0])
    }
  })

  it("generates only female first names when Woman is selected", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("combobox", { name: "Gender" }))
    fireEvent.click(screen.getByText("Woman"))
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(10)
    for (const line of lines) {
      expect(enNameData.femaleNames).toContain(line.split(" ")[0])
    }
  })
})

describe("MiscGenerator share links", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/")
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    })
  })

  it("parses a full share query and ignores invalid values", () => {
    expect(parseMiscUrlParams("?type=email&count=10&country=TR&format=json&gender=male")).toEqual({
      type: "email",
      count: 10,
      format: "json",
      phoneCountryCode: "TR",
      nameGender: "male",
    })
    expect(parseMiscUrlParams("?type=nope&count=abc&country=XX&format=nope&gender=nope")).toEqual({})
    expect(parseMiscUrlParams("?count=0")).toEqual({ count: 1 })
    expect(parseMiscUrlParams("?count=5000")).toEqual({ count: 1000 })
    expect(parseMiscUrlParams("")).toEqual({})
  })

  it("round-trips settings through build and parse", () => {
    const nameState = { type: "fullName" as const, count: 7, format: "csv" as const, phoneCountryCode: "DE", nameGender: "female" as const }
    expect(parseMiscUrlParams(buildMiscUrlParams(nameState))).toEqual(nameState)
    // Non-name types drop gender when building, so only shared keys round-trip.
    const phoneParams = buildMiscUrlParams({ ...nameState, type: "phone" })
    expect(parseMiscUrlParams(phoneParams)).toEqual({
      type: "phone",
      count: 7,
      format: "csv",
      phoneCountryCode: "DE",
    })
  })

  it("omits gender from the link unless generating names", () => {
    const phone = buildMiscUrlParams({ type: "tckn", count: 1, format: "text", phoneCountryCode: "TR", nameGender: "all" })
    expect(phone).toBe("?type=tckn&count=1&format=text&country=TR")
    expect(phone).not.toContain("gender")
    const names = buildMiscUrlParams({ type: "fullName", count: 1, format: "text", phoneCountryCode: "TR", nameGender: "male" })
    expect(names).toContain("gender=male")
  })

  it("restores settings from the URL on mount", () => {
    window.history.replaceState(null, "", "/?type=uuid&count=3")
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)

    const lines = getOutputLines()
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it("syncs the address bar on generate and shares the link", async () => {
    const onCopy = vi.fn()
    render(<MiscGenerator onCopy={onCopy} language="en" />)
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    expect(window.location.search).toContain("type=fullName")
    expect(window.location.search).toContain("count=1")

    fireEvent.click(screen.getByRole("button", { name: "Share" }))
    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith("Link copied to clipboard!"))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
  })

  it("copies a single line without touching the rest", async () => {
    const onCopy = vi.fn()
    render(<MiscGenerator onCopy={onCopy} language="en" />)
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    const lines = getOutputLines()
    expect(lines).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "Copy line 2" }))

    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith("Copied to clipboard!"))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(lines[1])
  })

  it("builds values purely for every type", () => {
    const values = buildMiscValues({
      type: "email",
      count: 5,
      language: "tr",
      phoneCountryCode: "TR",
      nameGender: "all",
      passwordSource: "wordlist",
      randomPasswordOptions: { length: 16, lowercase: true, uppercase: true, digits: true, symbols: true },
    })
    expect(values).toHaveLength(5)
    for (const value of values) {
      expect(value).toMatch(/@/)
    }
  })
})
