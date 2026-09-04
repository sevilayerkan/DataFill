import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MiscGenerator, datePool, fullNamePool, takeUnique } from "../components/MiscGenerator"
import { nameData as enNameData } from "../data/en/name-data"
import { nameData as trNameData } from "../data/tr/name-data"

function getOutputLines(): string[] {
  const output = document.querySelector('[aria-live="polite"]')
  return (output?.textContent ?? "").split("\n").filter(Boolean)
}

describe("MiscGenerator", () => {
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
    const unisex = fullNamePool("en", "unisex")
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

  it("shows Man/Woman/Unisex options for the full-name type", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="en" />)
    fireEvent.click(screen.getByRole("combobox", { name: "Gender" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["Man", "Woman", "Unisex"])
  })

  it("shows localized gender options in Turkish", () => {
    render(<MiscGenerator onCopy={vi.fn()} language="tr" />)
    fireEvent.click(screen.getByRole("combobox", { name: "Cinsiyet" }))
    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["Erkek", "Kadın", "Unisex"])
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
