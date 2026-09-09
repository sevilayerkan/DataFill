import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { AddressGenerator } from "../components/AddressGenerator"
import { addressData as trAddressData } from "../data/tr/address-data"

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeText ?? vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

function output(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement
}

describe("AddressGenerator", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("renders without crashing", () => {
    render(<AddressGenerator language="en" onCopy={mockOnCopy} />)
    expect(screen.getByText("Generate Address")).toBeInTheDocument()
  })

  it("generates a US-shaped address in English mode", () => {
    render(<AddressGenerator language="en" onCopy={mockOnCopy} />)
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByText("Generate Address"))
      expect(output().value).toMatch(/^\d+ .+\n.+, [A-Z]{2} \d{5}$/)
    }
  })

  it("picks a curated full address in Turkish mode", () => {
    render(<AddressGenerator language="tr" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Adres Üret"))
    expect(trAddressData.fullAddresses).toContain(output().value)
  })

  it("calls onCopy with the copied message after generating", async () => {
    render(<AddressGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Address"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Address copied to clipboard!"))
  })

  it("notifies when there is no address to copy", async () => {
    render(<AddressGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("No address to copy!"))
  })

  it("notifies with a failure message when copying is blocked", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")))
    render(<AddressGenerator language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByText("Generate Address"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))
    await waitFor(() =>
      expect(mockOnCopy).toHaveBeenCalledWith("Copy failed! Clipboard access was blocked."),
    )
  })
})
