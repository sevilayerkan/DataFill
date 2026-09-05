import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import FadelyTextUI from "../components/FadelyTextUI"

describe("FadelyTextUI", () => {
  it("renders without crashing", () => {
    render(<FadelyTextUI />)
    expect(screen.getByText("FadelyText")).toBeInTheDocument()
  })

  it("generates text with correct character count", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")
    const textArea = screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement

    fireEvent.change(characterInput, { target: { value: "50" } })
    fireEvent.click(generateButton)

    expect(textArea.value.length).toBe(50)
  })

  it("counts characters, words, and lines correctly", async () => {
    render(<FadelyTextUI />)
    // Use the header nav button (plain onClick -> setActiveTab) instead of the
    // Radix TabsTrigger, which doesn't activate on synthetic fireEvent clicks in jsdom.
    fireEvent.click(screen.getByRole("button", { name: "Counter" }))
    const textArea = await screen.findByPlaceholderText("Type or paste your text here...") as HTMLTextAreaElement
    const testText = "Hello\nWorld!\nThis is a test."

    fireEvent.change(textArea, { target: { value: testText } })

    expect(screen.getByText("Characters: 28 | Words: 6 | Lines: 3")).toBeInTheDocument()
  })

  it("clears the counter field and resets the stats", async () => {
    render(<FadelyTextUI />)
    fireEvent.click(screen.getByRole("button", { name: "Counter" }))
    const textArea = await screen.findByPlaceholderText("Type or paste your text here...") as HTMLTextAreaElement

    fireEvent.change(textArea, { target: { value: "some words here" } })
    expect(screen.getByText("Characters: 15 | Words: 3 | Lines: 1")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Clear Text"))

    expect(textArea.value).toBe("")
    expect(screen.getByText("Characters: 0 | Words: 0 | Lines: -")).toBeInTheDocument()
    expect(textArea).toHaveFocus()
  })

  it("keeps the last size when the character input is cleared", () => {
    render(<FadelyTextUI />)
    const characterInput = screen.getByLabelText("Characters:") as HTMLInputElement
    const generateButton = screen.getByText("Generate Text")
    const textArea = screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement

    // Clearing the field must not push 0 into state: Generate falls back to
    // the last committed size and restores the field.
    fireEvent.change(characterInput, { target: { value: "" } })
    expect(characterInput.value).toBe("")
    fireEvent.click(generateButton)

    expect(textArea.value.length).toBe(100)
    expect(characterInput.value).toBe("100")
  })
})
