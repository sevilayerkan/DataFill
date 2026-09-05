import { describe, it, expect } from "vitest"
import { parseNumericDraft } from "../lib/numeric-input"

describe("parseNumericDraft", () => {
  it("returns null while the field is empty or partial", () => {
    expect(parseNumericDraft("")).toBeNull()
    expect(parseNumericDraft("   ")).toBeNull()
    expect(parseNumericDraft("-")).toBeNull()
    expect(parseNumericDraft("abc")).toBeNull()
    expect(parseNumericDraft("Infinity")).toBeNull()
  })

  it("parses usable finite numbers", () => {
    expect(parseNumericDraft("50")).toBe(50)
    expect(parseNumericDraft(" 12 ")).toBe(12)
    expect(parseNumericDraft("0")).toBe(0)
  })
})
