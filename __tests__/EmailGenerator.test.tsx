import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { EmailGenerator } from "../components/EmailGenerator"
import { emailData as enEmailData } from "../data/en/email-data"

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeText ?? vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

/** The readonly output is the second textbox (after the custom-domain input). */
function output(): HTMLInputElement {
  return screen.getAllByRole("textbox")[1] as HTMLInputElement
}

describe("EmailGenerator", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("renders without crashing", () => {
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    expect(screen.getByText("Generate Email")).toBeInTheDocument()
    expect(screen.getByText("Custom Domain (optional):")).toBeInTheDocument()
  })

  it("generates a well-formed lowercase email from a known domain", () => {
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("Generate Email"))
      const value = output().value
      expect(value).toMatch(/^[a-z0-9._-]+@[a-z.]+\.[a-z]+$/)
      expect(enEmailData.domains).toContain(value.split("@")[1])
    }
  })

  it("honors a custom domain", () => {
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.change(screen.getByLabelText("Custom Domain (optional):"), {
      target: { value: "example.com" },
    })
    fireEvent.click(screen.getByText("Generate Email"))
    expect(output().value.endsWith("@example.com")).toBe(true)
  })

  it("folds Turkish characters in Turkish mode", () => {
    render(<EmailGenerator language="tr" onCopy={mockOnCopy} />)
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("E-posta Üret"))
      const value = output().value
      expect(value).toContain("@")
      expect(value.split("@")[0]).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
    }
  })

  it("calls onCopy with the copied message after generating", async () => {
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Email"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Email copied to clipboard!"))
  })

  it("notifies when there is no email to copy", async () => {
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("No email to copy!"))
  })

  it("notifies with a failure message when copying is blocked", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")))
    render(<EmailGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Email"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() =>
      expect(mockOnCopy).toHaveBeenCalledWith("Copy failed! Clipboard access was blocked."),
    )
  })
})
