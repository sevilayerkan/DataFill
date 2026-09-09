import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { TextTools } from "../components/TextTools"

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeText ?? vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
}

/** Switch the active tool via the Radix Select (options have role "option"). */
function switchTool(name: string) {
  fireEvent.click(screen.getByRole("combobox"))
  fireEvent.click(screen.getByRole("option", { name }))
}

function outputArea(): HTMLTextAreaElement {
  return screen.getByLabelText("Result will appear here…") as HTMLTextAreaElement
}

describe("TextTools case converter", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("renders the case converter by default", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    expect(screen.getByLabelText("Paste text here…")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "UPPER" })).toBeInTheDocument()
  })

  it("upper/lower/title/slug transforms the input", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    fireEvent.change(screen.getByLabelText("Paste text here…"), { target: { value: "hello world" } })

    fireEvent.click(screen.getByRole("button", { name: "UPPER" }))
    expect(outputArea().value).toBe("HELLO WORLD")

    fireEvent.click(screen.getByRole("button", { name: "Title" }))
    expect(outputArea().value).toBe("Hello World")

    fireEvent.click(screen.getByRole("button", { name: "lower" }))
    expect(outputArea().value).toBe("hello world")

    fireEvent.change(screen.getByLabelText("Paste text here…"), { target: { value: "Hello, World!" } })
    fireEvent.click(screen.getByRole("button", { name: "slug" }))
    expect(outputArea().value).toBe("hello-world")
  })
})

describe("TextTools lines", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("dedupes and sorts lines", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Sort / Dedupe lines")

    fireEvent.change(screen.getByLabelText("One entry per line…"), { target: { value: "b\na\nb" } })

    fireEvent.click(screen.getByRole("button", { name: "Dedupe" }))
    expect(outputArea().value).toBe("b\na")

    fireEvent.click(screen.getByRole("button", { name: "Sort A→Z" }))
    expect(outputArea().value).toBe("a\nb\nb")

    fireEvent.click(screen.getByRole("button", { name: "Sort + Dedupe" }))
    expect(outputArea().value).toBe("a\nb")
  })
})

describe("TextTools whitespace + base64", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("cleans messy whitespace", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Trim whitespace")

    fireEvent.change(screen.getByLabelText("Paste messy text…"), {
      target: { value: "  hello   world  \n\n  foo  " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Clean" }))
    expect(outputArea().value).toBe("hello world\nfoo")
  })

  it("encodes and decodes base64", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Base64")

    fireEvent.change(screen.getByLabelText("Text or Base64…"), { target: { value: "hello" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    expect(outputArea().value).toBe("aGVsbG8=")

    fireEvent.change(screen.getByLabelText("Text or Base64…"), { target: { value: "aGVsbG8=" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(outputArea().value).toBe("hello")
  })

  it("shows an alert on invalid base64", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Base64")

    fireEvent.change(screen.getByLabelText("Text or Base64…"), { target: { value: "!!!" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid Base64")
  })
})

describe("TextTools diff", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("shows the empty state with no input", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Diff")
    expect(screen.getByText("No diff — paste text in both fields.")).toBeInTheDocument()
  })

  it("marks added and removed lines", () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    switchTool("Diff")

    fireEvent.change(screen.getByLabelText("Before"), { target: { value: "a\nb" } })
    fireEvent.change(screen.getByLabelText("After"), { target: { value: "a\nc" } })

    const rows = screen.getAllByRole("listitem").map((li) => li.textContent)
    expect(rows).toContain(" a")
    expect(rows).toContain("+c")
    expect(rows).toContain("−b")
  })
})

describe("TextTools copy/share/URL", () => {
  const mockOnCopy = vi.fn()

  beforeEach(() => {
    mockOnCopy.mockClear()
    mockClipboard()
  })

  it("notifies when there is no text to copy", async () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("No text to copy!"))
  })

  it("copies the output and confirms", async () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    fireEvent.change(screen.getByLabelText("Paste text here…"), { target: { value: "hi" } })
    fireEvent.click(screen.getByRole("button", { name: "UPPER" }))
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Copied to clipboard!"))
  })

  it("notifies with a failure message when copying is blocked", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")))
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    fireEvent.change(screen.getByLabelText("Paste text here…"), { target: { value: "hi" } })
    fireEvent.click(screen.getByRole("button", { name: "UPPER" }))
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    await waitFor(() =>
      expect(mockOnCopy).toHaveBeenCalledWith("Copy failed! Clipboard access was blocked."),
    )
  })

  it("shares a link carrying the active tool and confirms", async () => {
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    fireEvent.click(screen.getByRole("button", { name: "Share" }))
    await waitFor(() => expect(mockOnCopy).toHaveBeenCalledWith("Link copied to clipboard!"))
    expect(window.location.search).toContain("tool=case")
    expect(window.location.search).toContain("tab=tools")
  })

  it("restores the tool from ?tool= in the URL", () => {
    window.history.replaceState(null, "", "/?tool=diff")
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    expect(screen.getByLabelText("Before")).toBeInTheDocument()
    expect(screen.queryByLabelText("Paste text here…")).not.toBeInTheDocument()
  })

  it("falls back to the case tool for unknown ?tool= values", () => {
    window.history.replaceState(null, "", "/?tool=nope")
    render(<TextTools language="en" onCopy={mockOnCopy} />)
    expect(screen.getByLabelText("Paste text here…")).toBeInTheDocument()
  })
})
