import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { NameGenerator } from "../components/NameGenerator"
import { nameData as enNameData } from "../data/en/name-data"
import { nameData as trNameData } from "../data/tr/name-data"

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeText ?? vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

function output(): HTMLInputElement {
  return screen.getByRole("textbox") as HTMLInputElement
}

function selectOrigin(name: string) {
  fireEvent.click(screen.getByRole("combobox"))
  fireEvent.click(screen.getByRole("option", { name }))
}

describe("NameGenerator", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("renders without crashing", () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    expect(screen.getByText("Generate Name")).toBeInTheDocument()
    expect(screen.getByText("Name Origin:")).toBeInTheDocument()
  })

  it("generates a first + last name from the English lists", () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Name"))

    const [first, last] = output().value.split(" ")
    expect(first).toBeTruthy()
    expect(last).toBeTruthy()
    expect([...enNameData.maleNames, ...enNameData.femaleNames]).toContain(first)
    expect(enNameData.lastNames).toContain(last)
  })

  it("generates Turkish names after switching origin", () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    selectOrigin("Turkish")
    fireEvent.click(screen.getByText("Generate Name"))

    const [first, last] = output().value.split(" ")
    expect([...trNameData.maleNames, ...trNameData.femaleNames]).toContain(first)
    expect(trNameData.lastNames).toContain(last)
  })

  it("respects the gender radio selection", () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)

    fireEvent.click(screen.getByRole("radio", { name: "Male" }))
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("Generate Name"))
      expect(enNameData.maleNames).toContain(output().value.split(" ")[0])
    }

    fireEvent.click(screen.getByRole("radio", { name: "Female" }))
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("Generate Name"))
      expect(enNameData.femaleNames).toContain(output().value.split(" ")[0])
    }
  })

  it("calls onCopy with the copied message after generating", async () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Name"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Name copied to clipboard!"))
  })

  it("notifies when there is no name to copy", async () => {
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("No name to copy!"))
  })

  it("notifies with a failure message when copying is blocked", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")))
    render(<NameGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Name"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() =>
      expect(mockOnCopy).toHaveBeenCalledWith("Copy failed! Clipboard access was blocked."),
    )
  })

  it("renders Turkish labels in Turkish mode", () => {
    render(<NameGenerator language="tr" onCopy={mockOnCopy} />)
    expect(screen.getByText("İsim Üret")).toBeInTheDocument()
  })
})
