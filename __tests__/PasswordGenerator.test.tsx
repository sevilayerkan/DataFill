import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import {
  PasswordGenerator,
  createWordlistState,
  nextWordlistPassword,
} from "../components/PasswordGenerator"
import { passwordPool, uniquePasswords } from "../components/MiscGenerator"
import { passwordData as enPasswordData } from "../data/en/password-data"
import { passwordData as trPasswordData } from "../data/tr/password-data"

describe("PasswordGenerator", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    })
  })

  it("renders without crashing", () => {
    render(<PasswordGenerator language="en" onCopy={mockOnCopy} />)
    expect(screen.getByText("Generate Password")).toBeInTheDocument()
  })

  it("generates a 12-char mixed random password by default", () => {
    render(<PasswordGenerator language="en" onCopy={mockOnCopy} />)
    const generateButton = screen.getByText("Generate Password")
    const input = screen.getByRole("textbox") as HTMLInputElement
    for (let i = 0; i < 10; i++) {
      fireEvent.click(generateButton)
      expect(input.value).toHaveLength(12)
      expect(input.value).toMatch(/^[a-zA-Z0-9!@#$%^&*()_+]+$/)
      expect(input.value).toMatch(/[A-Za-z]/)
      expect(input.value).toMatch(/\d/)
    }
  })

  it("never repeats a password within a session", () => {
    render(<PasswordGenerator language="en" onCopy={mockOnCopy} />)
    const generateButton = screen.getByText("Generate Password")
    const input = screen.getByRole("textbox") as HTMLInputElement
    const seen = new Set<string>()
    for (let i = 0; i < 25; i++) {
      fireEvent.click(generateButton)
      seen.add(input.value)
    }
    expect(seen.size).toBe(25)
  })

  it("calls onCopy with correct message when copying", () => {
    render(<PasswordGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Password"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    expect(mockOnCopy).toHaveBeenCalledWith("Password copied to clipboard!")
  })

  it("generates word-free ASCII passwords in Turkish mode", () => {
    render(<PasswordGenerator language="tr" onCopy={mockOnCopy} />)
    const generateButton = screen.getByText("Şifre Üret")
    const input = screen.getByRole("textbox") as HTMLInputElement
    const seen = new Set<string>()
    for (let i = 0; i < 25; i++) {
      fireEvent.click(generateButton)
      // Saf random: kelime yok, Türkçe karakter yok, harf/rakam karışık, tam 12 karakter.
      expect(input.value).toHaveLength(12)
      expect(input.value).toMatch(/^[A-Za-z0-9!@#$%^&*()_+]+$/)
      expect(input.value).not.toMatch(/[çÇğĞıİöÖşŞüÜ]/)
      expect(input.value).toMatch(/[A-Za-z]/)
      expect(input.value).toMatch(/\d/)
      seen.add(input.value)
    }
    expect(seen.size).toBe(25)
  })
})

describe("nextWordlistPassword", () => {
  it("havuz ve rastgeleı yarı yarıya harmanlar, tekrar vermez", () => {
    const state = createWordlistState()
    const pool = ["a1", "b2", "c3"]
    const randoms = ["x0", "x1", "x2"]
    const picks = [true, false, true, false, true, false]
    let k = 0
    const out = picks.map(() =>
      nextWordlistPassword(
        state,
        pool,
        () => randoms.shift() as string,
        () => picks[k++],
      ),
    )
    // Havuzdan gelenler kuranın permütasyonu, rastgeleler sırasıyla.
    expect([out[0], out[2], out[4]].sort()).toEqual(["a1", "b2", "c3"])
    expect([out[1], out[3], out[5]]).toEqual(["x0", "x1", "x2"])
    expect(new Set(out).size).toBe(6)
  })

  it("havuz bitince tamamen rastgeleye döner", () => {
    const state = createWordlistState()
    const pool = ["a1"]
    const randoms = ["x0", "x1"]
    const picks = [true, false, false]
    let k = 0
    const out = picks.map(() =>
      nextWordlistPassword(
        state,
        pool,
        () => randoms.shift() as string,
        () => picks[k++],
      ),
    )
    expect(out).toEqual(["a1", "x0", "x1"])
  })

  it("gösterilmiş havuz kaydını atlar, çakışan rastgeleı yeniler", () => {
    const state = createWordlistState()
    state.shown.add("a1")
    const pool = ["a1", "b2"]
    const randoms = ["b2", "x9"]
    const picks = [true, false]
    let k = 0
    const out = picks.map(() =>
      nextWordlistPassword(
        state,
        pool,
        () => randoms.shift() as string,
        () => picks[k++],
      ),
    )
    expect(out).toEqual(["b2", "x9"])
  })
})

describe("password pool", () => {
  it("holds only unique curated passwords per language", () => {
    expect(trPasswordData.passwords).toHaveLength(86)
    expect(enPasswordData.passwords).toHaveLength(141)
    for (const data of [trPasswordData, enPasswordData]) {
      expect(new Set(data.passwords).size).toBe(data.passwords.length)
      expect(new Set(data.mixed).size).toBe(data.mixed.length)
    }
  })

  it("production pools hold only mixed letter+digit passwords", () => {
    expect(passwordPool("tr")).toHaveLength(85)
    expect(passwordPool("en")).toHaveLength(72)
    for (const language of ["tr", "en"] as const) {
      for (const value of passwordPool(language)) {
        expect(value).toMatch(/\p{L}/u)
        expect(value).toMatch(/\d/)
      }
    }
  })

  it("never serves Turkish passwords in English generation", () => {
    const enPool = new Set(passwordPool("en"))
    expect(enPool.has("S1f3rGuv3nL!k3")).toBe(false)
    expect(enPool.has("Guv3nL!k123")).toBe(false)
    for (const value of enPool) {
      expect(value).not.toMatch(/[çÇğĞıİöÖşŞüÜ]/)
    }
    expect(enPool.has("M0d3rn@P4ssw0rd")).toBe(true)
  })

  it("serves Turkish passwords in Turkish generation", () => {
    const trPool = new Set(passwordPool("tr"))
    expect(trPool.has("S1f3rGuv3nL!k3")).toBe(true)
    expect(trPool.has("Guv3nL!k123")).toBe(true)
    expect(trPool.has("M0d3rn@P4ssw0rd")).toBe(false)
  })

  it("holds no Turkish characters in any production pool", () => {
    for (const language of ["tr", "en"] as const) {
      for (const value of passwordPool(language)) {
        expect(value).not.toMatch(/[çÇğĞıİöÖşŞüÜ]/)
      }
    }
  })

  it("uniquePasswords stays unique within pool size", () => {
    for (const language of ["tr", "en"] as const) {
      const values = uniquePasswords(50, language)
      expect(values).toHaveLength(50)
      expect(new Set(values).size).toBe(50)
      const pool = new Set(passwordPool(language))
      for (const value of values) {
        expect(pool.has(value)).toBe(true)
      }
    }
  })

  it("uniquePasswords stays unique and mixed past pool size", () => {
    for (const language of ["tr", "en"] as const) {
      const values = uniquePasswords(200, language)
      expect(values).toHaveLength(200)
      expect(new Set(values).size).toBe(200)
      for (const value of values) {
        expect(value).toMatch(/\p{L}/u)
        expect(value).toMatch(/\d/)
      }
    }
  })
})
