import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import FadelyTextUI from "../components/FadelyTextUI"

function mockClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }))
  return screen.getByRole("dialog", { name: "All features" })
}

describe("AppMenu hamburger navigation", () => {
  beforeEach(() => {
    mockClipboard()
    window.history.replaceState(null, "", "/")
    window.localStorage.clear()
  })

  it("renders a hamburger button that opens a dialog with every feature", () => {
    render(<FadelyTextUI />)
    const dialog = openMenu()

    // Main sections
    expect(within(dialog).getByRole("button", { name: /Generate/ })).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /Counter/ })).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: /Dataset/ })).toBeInTheDocument()

    // All 26 fake-data generators
    const generators = [
      "Full Name", "Email", "Address", "Password", "Phone", "UUID", "Date",
      "TCKN (TR ID)", "IBAN (TR)", "VKN (TR Tax ID)", "License Plate (TR)",
      "Username", "Company", "Job Title", "Credit Card (test)", "Slug",
      "Color (hex)", "IPv4", "IPv6", "MAC address", "Coordinates (lat,lng)",
      "Hash (SHA-256)", "Barcode (EAN-13)", "Boolean", "Lorem sentence", "Lorem paragraph",
    ]
    for (const name of generators) {
      expect(within(dialog).getByRole("button", { name })).toBeInTheDocument()
    }

    // All 5 text tools
    const tools = ["Case converter", "Sort / Dedupe lines", "Trim whitespace", "Base64", "Diff"]
    for (const name of tools) {
      expect(within(dialog).getByRole("button", { name })).toBeInTheDocument()
    }
  })

  it("deep-links to a generator and closes the menu", () => {
    render(<FadelyTextUI />)
    const dialog = openMenu()
    fireEvent.click(within(dialog).getByRole("button", { name: "Email" }))

    expect(screen.queryByRole("dialog", { name: "All features" })).not.toBeInTheDocument()
    expect(window.location.search).toContain("tab=misc")
    expect(window.location.search).toContain("type=email")
  })

  it("deep-links to a text tool and closes the menu", () => {
    render(<FadelyTextUI />)
    const dialog = openMenu()
    fireEvent.click(within(dialog).getByRole("button", { name: "Diff" }))

    expect(screen.queryByRole("dialog", { name: "All features" })).not.toBeInTheDocument()
    expect(window.location.search).toContain("tab=tools")
    expect(window.location.search).toContain("tool=diff")
    expect(screen.getByLabelText("Before")).toBeInTheDocument()
  })

  it("switches generator while the misc panel is already open", () => {
    render(<FadelyTextUI />)
    fireEvent.click(screen.getByRole("button", { name: "Misc" }))
    expect(window.location.search).toContain("tab=misc")

    const dialog = openMenu()
    fireEvent.click(within(dialog).getByRole("button", { name: "Username" }))

    expect(screen.queryByRole("dialog", { name: "All features" })).not.toBeInTheDocument()
    expect(window.location.search).toContain("tab=misc")
    expect(window.location.search).toContain("type=username")
  })

  it("closes on Escape", () => {
    render(<FadelyTextUI />)
    openMenu()
    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByRole("dialog", { name: "All features" })).not.toBeInTheDocument()
  })
})
