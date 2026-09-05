import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { PhoneNumberGenerator } from "../components/PhoneNumberGenerator"

describe("PhoneNumberGenerator", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    })
  })

  it("renders without crashing", () => {
    render(<PhoneNumberGenerator language="en" onCopy={mockOnCopy} />)
    expect(screen.getByText("Generate Phone Number")).toBeInTheDocument()
  })

  it("generates a phone number with correct country code", () => {
    render(<PhoneNumberGenerator language="en" onCopy={mockOnCopy} />)
    const generateButton = screen.getByText("Generate Phone Number")
    const phoneInput = screen.getByRole("textbox") as HTMLInputElement

    fireEvent.click(generateButton)

    expect(phoneInput.value).toMatch(/^05\d{2} \d{3} \d{2} \d{2}$/)
  })

  it("changes country and generates correct phone number", () => {
    render(<PhoneNumberGenerator language="en" onCopy={mockOnCopy} />)
    const countrySelect = screen.getByRole("combobox")
    const generateButton = screen.getByText("Generate Phone Number")
    const phoneInput = screen.getByRole("textbox") as HTMLInputElement

    fireEvent.click(countrySelect)
    fireEvent.click(screen.getByText(/United States/))
    fireEvent.click(generateButton)

    expect(phoneInput.value).toMatch(/^\+1\d{10}$/)
  })

  it("calls onCopy with correct message when copying", async () => {
    render(<PhoneNumberGenerator language="en" onCopy={mockOnCopy} />)
    const generateButton = screen.getByText("Generate Phone Number")
    const copyButton = screen.getByText("Copy to Clipboard")

    fireEvent.click(generateButton)
    fireEvent.click(copyButton)

    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Phone number copied to clipboard!"))
  })

  it("notifies with a failure message when copying is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    })
    render(<PhoneNumberGenerator language="en" onCopy={mockOnCopy} />)

    fireEvent.click(screen.getByText("Generate Phone Number"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))

    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Copy failed! Clipboard access was blocked."))
  })
})
