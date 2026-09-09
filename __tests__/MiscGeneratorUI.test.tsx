import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MiscGenerator } from "../components/MiscGenerator"
import { nameData as enNameData } from "../data/en/name-data"

function mockClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

function selectOption(comboboxName: string, optionName: string) {
  fireEvent.click(screen.getByRole("combobox", { name: comboboxName }))
  fireEvent.click(screen.getByRole("option", { name: optionName }))
}

function outputLines(): string[] {
  const output = document.querySelector('[aria-live="polite"]')
  return (output?.textContent ?? "").split("\n").filter(Boolean)
}

describe("MiscGeneratorUI type + format", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("switches data type via the Select", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    selectOption("Select Data Type", "Email")
    expect(outputLines()[0]).toMatch(/^[a-z0-9._-]+@[a-z.]+\.[a-z]+$/)

    selectOption("Select Data Type", "UUID")
    expect(outputLines()[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("reformats the same rows as JSON and CSV", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    selectOption("Format", "JSON")
    const parsed = JSON.parse(document.querySelector("pre")?.textContent ?? "")
    expect(parsed).toHaveLength(1)
    expect(typeof parsed[0]).toBe("string")

    selectOption("Format", "CSV")
    expect(document.querySelector("pre")?.textContent ?? "").toMatch(/^value\n.+/)
  })

  it("filters full names by gender", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    selectOption("Gender", "Man")
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Generate" }))
      expect(enNameData.maleNames).toContain(outputLines()[0].split(" ")[0])
    }
  })

  it("restores settings from a share URL", () => {
    window.history.replaceState(null, "", "/?type=email&count=3&format=json")
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    const parsed = JSON.parse(document.querySelector("pre")?.textContent ?? "")
    expect(parsed).toHaveLength(3)
    for (const value of parsed) expect(value).toContain("@")
  })
})

describe("MiscGeneratorUI password options", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  function showRandomPasswords() {
    selectOption("Select Data Type", "Password")
    selectOption("Password Source", "Fully Random")
  }

  function lengthInput(): HTMLInputElement {
    return screen.getByLabelText("Password Length") as HTMLInputElement
  }

  it("generates fully random passwords and follows the length input", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    showRandomPasswords()

    expect(outputLines()[0]).toHaveLength(16)

    fireEvent.change(lengthInput(), { target: { value: "8" } })
    expect(lengthInput().value).toBe("8")
    expect(outputLines()[0]).toHaveLength(8)
  })

  it("drops symbol output when Symbols is unchecked", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    showRandomPasswords()

    fireEvent.click(screen.getByRole("checkbox", { name: "Symbols (!@#…)" }))
    expect(outputLines()[0]).toMatch(/^[A-Za-z0-9]+$/)
  })

  it("keeps at least one charset enabled", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    showRandomPasswords()

    fireEvent.click(screen.getByRole("checkbox", { name: "Lowercase (a–z)" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Uppercase (A–Z)" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Digits (0–9)" }))
    // Unchecking the last charset is refused: Symbols stays on.
    fireEvent.click(screen.getByRole("checkbox", { name: "Symbols (!@#…)" }))
    expect(screen.getByRole("checkbox", { name: "Symbols (!@#…)" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  it("restores the length draft to the committed value on blur when cleared", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    showRandomPasswords()

    fireEvent.change(lengthInput(), { target: { value: "" } })
    expect(lengthInput().value).toBe("")
    fireEvent.blur(lengthInput())
    expect(lengthInput().value).toBe("16")
  })
})

describe("MiscGeneratorUI copy/share/export/phone", () => {
  const mockOnCopy = vi.fn()
  let createObjectURL: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let origCreate: typeof URL.createObjectURL | undefined

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
    origCreate = URL.createObjectURL
    createObjectURL = vi.fn((_obj: Blob | MediaSource) => "blob:mock-url")
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  afterEach(() => {
    clickSpy.mockRestore()
    if (origCreate) URL.createObjectURL = origCreate
    else delete (URL as unknown as Record<string, unknown>).createObjectURL
    document.body.innerHTML = ""
  })

  function exportedAnchor(): HTMLAnchorElement {
    const appendSpy = vi.spyOn(document.body, "appendChild")
    fireEvent.click(screen.getByRole("button", { name: "Export" }))
    const anchor = appendSpy.mock.calls
      .map(([node]) => node)
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
    appendSpy.mockRestore()
    expect(anchor).toBeDefined()
    return anchor!
  }

  it("copies the value, a single line, and shares the link", async () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Copied to clipboard!"))

    fireEvent.click(screen.getByRole("button", { name: "Copy line 1" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledTimes(2))

    // The address bar syncs on Generate (mount alone doesn't sync it).
    fireEvent.click(screen.getByRole("button", { name: "Generate" }))
    fireEvent.click(screen.getByRole("button", { name: "Share" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Link copied to clipboard!"))
    expect(window.location.search).toContain("type=fullName")
  })

  it("exports the rows as a JSON file by default", async () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)

    const anchor = exportedAnchor()
    expect(anchor.download).toMatch(/\.json$/)
    expect(createObjectURL).toHaveBeenCalledOnce()
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Exported JSON file!"))
  })

  it("exports the rows as CSV after switching the export format", async () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    selectOption("Export Format", "CSV")

    const anchor = exportedAnchor()
    expect(anchor.download).toMatch(/\.csv$/)
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Exported CSV file!"))
  })

  it("switches phone country and output shape", () => {
    render(<MiscGenerator onCopy={mockOnCopy} language="en" />)
    selectOption("Select Data Type", "Phone")

    expect(outputLines()[0]).toMatch(/^\+1\d{10}$/)

    selectOption("Country", "Turkey (+90)")
    expect(outputLines()[0]).toMatch(/^05\d{2} \d{3} \d{2} \d{2}$/)
  })
})
