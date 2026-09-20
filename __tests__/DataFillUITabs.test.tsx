import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import DataFillUI from "../components/DataFillUI"

function mockClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

function navTo(name: string) {
  fireEvent.click(screen.getByRole("button", { name }))
}

describe("DataFillUI tab navigation", () => {
  beforeEach(() => {
    mockClipboard()
  })

  it("opens the Misc generator from the header nav and syncs the URL", () => {
    render(<DataFillUI />)
    navTo("Misc")

    // The count input only exists inside the Misc panel (header + panel
    // both have a "Generate" button, so the name alone is ambiguous).
    expect(screen.getByRole("spinbutton")).toBeInTheDocument()
    expect(screen.queryByLabelText("Characters:")).not.toBeInTheDocument()
    expect(window.location.search).toContain("tab=misc")
  })

  it("opens the Tools tab and syncs the URL", () => {
    render(<DataFillUI />)
    navTo("Tools")

    expect(screen.getByLabelText("Paste text here…")).toBeInTheDocument()
    expect(window.location.search).toContain("tab=tools")
  })

  it("cleans tool/type params and the tab when returning to Generate", () => {
    window.history.replaceState(null, "", "/?tool=diff&tab=tools")
    render(<DataFillUI />)
    expect(screen.getByLabelText("Before")).toBeInTheDocument()

    navTo("Generate")

    expect(window.location.pathname).toBe("/")
    expect(window.location.search).toBe("")
    expect(screen.getByLabelText("Characters:")).toBeInTheDocument()
  })
})

describe("DataFillUI URL restore", () => {
  beforeEach(() => {
    mockClipboard()
  })

  it("opens the counter from ?tab=counter", () => {
    window.history.replaceState(null, "", "/?tab=counter")
    render(<DataFillUI />)
    expect(screen.getByPlaceholderText("Type or paste your text here...")).toBeInTheDocument()
  })

  it("opens tools from ?tab=tools", () => {
    window.history.replaceState(null, "", "/?tab=tools")
    render(<DataFillUI />)
    expect(screen.getByLabelText("Paste text here…")).toBeInTheDocument()
  })

  it("prefers ?tool= over a stale tab", () => {
    window.history.replaceState(null, "", "/?tool=diff&tab=generate")
    render(<DataFillUI />)
    expect(screen.getByLabelText("Before")).toBeInTheDocument()
  })

  it("prefers ?type= over a stale tab", () => {
    window.history.replaceState(null, "", "/?type=username&tab=generate")
    render(<DataFillUI />)
    expect(screen.getByRole("spinbutton")).toBeInTheDocument()
    expect(screen.queryByLabelText("Characters:")).not.toBeInTheDocument()
  })

  it("ignores unknown tab values", () => {
    window.history.replaceState(null, "", "/?tab=nope")
    render(<DataFillUI />)
    expect(screen.getByLabelText("Characters:")).toBeInTheDocument()
  })
})

describe("DataFillUI generate extras", () => {
  beforeEach(() => {
    mockClipboard()
  })

  function characterInput(): HTMLInputElement {
    return screen.getByLabelText("Characters:") as HTMLInputElement
  }

  function generatedOutput(): HTMLTextAreaElement {
    return screen.getByPlaceholderText("Generated text will appear here...") as HTMLTextAreaElement
  }

  it("restores the last size when the cleared field loses focus", () => {
    render(<DataFillUI />)
    fireEvent.change(characterInput(), { target: { value: "" } })
    expect(characterInput().value).toBe("")

    fireEvent.blur(characterInput())

    expect(characterInput().value).toBe("100")
  })

  it("generates spaceless output with No Spaces checked", () => {
    render(<DataFillUI />)
    fireEvent.click(screen.getByRole("checkbox", { name: "No Spaces" }))
    fireEvent.change(characterInput(), { target: { value: "50" } })
    fireEvent.click(screen.getByText("Generate Text"))

    expect(generatedOutput().value).toHaveLength(50)
    expect(generatedOutput().value).not.toMatch(/\s/)
  })

  it("generates alphanumeric output with No Special Characters checked", () => {
    render(<DataFillUI />)
    fireEvent.click(screen.getByRole("checkbox", { name: "No Special Characters" }))
    fireEvent.change(characterInput(), { target: { value: "50" } })
    fireEvent.click(screen.getByText("Generate Text"))

    expect(generatedOutput().value).toHaveLength(50)
    expect(generatedOutput().value).toMatch(/^[a-zA-Z0-9]*$/)
  })

  it("shows a notification when the generated text is copied", async () => {
    render(<DataFillUI />)
    fireEvent.change(characterInput(), { target: { value: "10" } })
    fireEvent.click(screen.getByText("Generate Text"))
    fireEvent.click(screen.getByText("Copy to Clipboard"))

    expect(await screen.findByRole("status")).toHaveTextContent("Copied to clipboard!")
  })

  it("shows a notification when there is nothing to copy", async () => {
    render(<DataFillUI />)
    fireEvent.click(screen.getByText("Copy to Clipboard"))

    expect(await screen.findByRole("status")).toHaveTextContent("No text to copy!")
  })

  it("lets the generated text be edited directly", () => {
    render(<DataFillUI />)
    const output = screen.getByPlaceholderText(
      "Generated text will appear here...",
    ) as HTMLTextAreaElement
    fireEvent.change(output, { target: { value: "hand-edited" } })
    expect(output.value).toBe("hand-edited")
  })
})

describe("DataFillUI language + theme", () => {
  beforeEach(() => {
    mockClipboard()
  })

  it("boots in Turkish when localStorage pins it", () => {
    window.localStorage.setItem("datafill-language", "tr")
    render(<DataFillUI />)
    expect(screen.getByText("Metin Üret")).toBeInTheDocument()
  })

  it("persists the language choice and sets the document lang", () => {
    render(<DataFillUI />)
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Turkish" }))

    expect(window.localStorage.getItem("datafill-language")).toBe("tr")
    expect(document.documentElement.lang).toBe("tr")
    expect(screen.getByText("Metin Üret")).toBeInTheDocument()
  })

  it("toggles the theme switch without crashing", () => {
    render(<DataFillUI />)
    const themeSwitch = screen.getByRole("switch")
    fireEvent.click(themeSwitch)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })
})
