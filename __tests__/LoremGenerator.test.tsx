import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import FadelyTextUI from "../components/FadelyTextUI"
import {
  LOREM_BASE,
  LOREM_MAX_LENGTH,
  LOREM_MIN_LENGTH,
  clampLoremLength,
  generateLoremText,
  generateLoremSentence,
  generateLoremParagraph,
} from "../lib/lorem"

describe("clampLoremLength", () => {
  it("passes normal values through floored", () => {
    expect(clampLoremLength(100)).toBe(100)
    expect(clampLoremLength(50.9)).toBe(50)
  })

  it("caps values above the max", () => {
    expect(clampLoremLength(LOREM_MAX_LENGTH + 1)).toBe(LOREM_MAX_LENGTH)
    expect(clampLoremLength(1_000_000)).toBe(LOREM_MAX_LENGTH)
  })

  it("floors values below the min", () => {
    expect(clampLoremLength(0)).toBe(LOREM_MIN_LENGTH)
    expect(clampLoremLength(-42)).toBe(LOREM_MIN_LENGTH)
  })

  it("maps non-finite values to the min", () => {
    expect(clampLoremLength(NaN)).toBe(LOREM_MIN_LENGTH)
    expect(clampLoremLength(Infinity)).toBe(LOREM_MIN_LENGTH)
  })
})

describe("generateLoremText", () => {
  it("returns exactly the requested length", () => {
    expect(generateLoremText(100)).toHaveLength(100)
    expect(generateLoremText(50)).toHaveLength(50)
  })

  it("repeats the base chunk verbatim", () => {
    const size = 200
    expect(generateLoremText(size)).toBe(
      LOREM_BASE.repeat(Math.ceil(size / LOREM_BASE.length)).slice(0, size),
    )
  })

  it("never exceeds the max length", () => {
    expect(generateLoremText(1_000_000)).toHaveLength(LOREM_MAX_LENGTH)
    expect(generateLoremText(LOREM_MAX_LENGTH + 500)).toHaveLength(LOREM_MAX_LENGTH)
  })

  it("never goes below the min length", () => {
    expect(generateLoremText(0)).toHaveLength(LOREM_MIN_LENGTH)
    expect(generateLoremText(-10)).toHaveLength(LOREM_MIN_LENGTH)
  })

  it("keeps exact length with whitespace/special-char options", () => {
    const noSpaces = generateLoremText(200, { removeSpaces: true })
    expect(noSpaces).toHaveLength(200)
    expect(noSpaces).not.toMatch(/\s/)

    const alnum = generateLoremText(200, { removeSpecialChars: true })
    expect(alnum).toHaveLength(200)
    expect(alnum).toMatch(/^[a-zA-Z0-9]*$/)
  })

  it("keeps exact max length with options enabled", () => {
    const text = generateLoremText(1_000_000, { removeSpaces: true, removeSpecialChars: true })
    expect(text).toHaveLength(LOREM_MAX_LENGTH)
  })
})

describe("generateLoremSentence / generateLoremParagraph", () => {
  it("emits a capitalized sentence ending with a period", () => {
    for (const language of ["en", "tr"] as const) {
      const sentence = generateLoremSentence(language)
      expect(sentence).toMatch(/^[A-ZÇĞİÖŞÜ].*\.$/)
      const words = sentence.slice(0, -1).split(" ")
      expect(words.length).toBeGreaterThanOrEqual(6)
      expect(words.length).toBeLessThanOrEqual(14)
    }
  })

  it("joins 3-6 sentences into a paragraph", () => {
    const paragraph = generateLoremParagraph("en")
    expect(paragraph.match(/\./g)?.length).toBeGreaterThanOrEqual(3)
    expect(paragraph.match(/\./g)?.length).toBeLessThanOrEqual(6)
  })
})

describe("FadelyTextUI lorem max-len control", () => {
  it("exposes min/max bounds on the character input", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    expect(characterInput).toHaveAttribute("min", String(LOREM_MIN_LENGTH))
    expect(characterInput).toHaveAttribute("max", String(LOREM_MAX_LENGTH))
  })

  it("caps generated output at the max length", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")
    const textArea = screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement

    fireEvent.change(characterInput, { target: { value: "99999999" } })
    fireEvent.click(generateButton)

    expect(textArea.value).toHaveLength(LOREM_MAX_LENGTH)
  })

  it("warns instead of silently clamping when over the max", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")
    const textArea = screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement

    // Warning appears as soon as the oversized value is typed.
    fireEvent.change(characterInput, { target: { value: "99999999" } })
    const warning = screen.getByRole("alert")
    expect(warning).toHaveTextContent(`Maximum ${LOREM_MAX_LENGTH} characters allowed`)

    // Generate still caps output at the max and keeps the warning visible.
    fireEvent.click(generateButton)
    expect(textArea.value).toHaveLength(LOREM_MAX_LENGTH)
    expect(screen.getByRole("alert")).toHaveTextContent(`Maximum ${LOREM_MAX_LENGTH} characters allowed`)
  })

  it("shows no warning for in-range input", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")

    fireEvent.change(characterInput, { target: { value: "50" } })
    fireEvent.click(generateButton)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("clears the warning once the value is back in range", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement

    fireEvent.change(characterInput, { target: { value: "99999999" } })
    expect(screen.getByRole("alert")).toBeInTheDocument()

    fireEvent.change(characterInput, { target: { value: "100" } })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("clamps non-positive input up to the min length", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")
    const textArea = screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement

    fireEvent.change(characterInput, { target: { value: "0" } })
    fireEvent.click(generateButton)

    expect(textArea.value).toHaveLength(LOREM_MIN_LENGTH)
  })
})
