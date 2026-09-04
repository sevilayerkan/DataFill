import { describe, it, expect, vi, afterEach } from "vitest"
import { copyTextToClipboard } from "../lib/clipboard"

describe("copyTextToClipboard", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")
  const doc = document as unknown as { execCommand?: (command: string) => boolean }
  const originalExec = doc.execCommand

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard)
    } else {
      Reflect.deleteProperty(navigator, "clipboard")
    }
    doc.execCommand = originalExec
  })

  it("uses the async Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })

    await expect(copyTextToClipboard("hello")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("hello")
  })

  it("falls back to execCommand when the Clipboard API is missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
    doc.execCommand = vi.fn().mockReturnValue(true)

    await expect(copyTextToClipboard("hello")).resolves.toBe(true)
    expect(doc.execCommand).toHaveBeenCalledWith("copy")
  })

  it("resolves false when every path fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    })
    // jsdom implements no execCommand, so the legacy path throws -> false.
    doc.execCommand = originalExec

    await expect(copyTextToClipboard("hello")).resolves.toBe(false)
  })
})
