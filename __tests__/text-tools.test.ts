import { describe, it, expect, vi } from "vitest"
import {
  toUpper,
  toLower,
  toTitle,
  toSlug,
  sortLines,
  dedupeLines,
  sortAndDedupeLines,
  cleanWhitespace,
  collapseWhitespace,
  base64Encode,
  base64Decode,
  isToolId,
  parseToolsUrlParams,
  buildToolsUrlParams,
  diffLines,
} from "../lib/text-tools"

describe("toUpper / toLower", () => {
  it("upper/lowercases without a locale", () => {
    expect(toUpper("hello world")).toBe("HELLO WORLD")
    expect(toLower("HELLO WORLD")).toBe("hello world")
    expect(toUpper("")).toBe("")
    expect(toLower("")).toBe("")
  })

  it("is locale-aware for Turkish dotted/dotless I", () => {
    // Without locale: "i" -> "I" (dotless).
    expect(toUpper("i")).toBe("I")
    // With Turkish locale: "i" -> "İ" (dotted capital).
    expect(toUpper("i", "tr")).toBe("i".toLocaleUpperCase("tr"))
    expect(toUpper("istanbul", "tr")).toBe("istanbul".toLocaleUpperCase("tr"))
    // Without locale: "I" -> "i"; with Turkish locale: "I" -> "ı".
    expect(toLower("I")).toBe("i")
    expect(toLower("I", "tr")).toBe("I".toLocaleLowerCase("tr"))
    expect(toLower("I", "tr")).toBe("ı")
  })
})

describe("toTitle", () => {
  it("title-cases each word", () => {
    expect(toTitle("hello world")).toBe("Hello World")
    expect(toTitle("HELLO WORLD")).toBe("Hello World")
    expect(toTitle("hELLo wORLD")).toBe("Hello World")
    expect(toTitle("")).toBe("")
  })

  it("keeps non-letters as separators", () => {
    // `-` and `_` are not letters, so each run title-cases separately.
    expect(toTitle("hello-world foo_bar")).toBe("Hello-World Foo_Bar")
    expect(toTitle("123 abc")).toBe("123 Abc")
  })

  it("is locale-aware", () => {
    expect(toTitle("istanbul", "tr")).toBe("istanbul".toLocaleLowerCase("tr").replace(/\p{L}+/gu, (w) => (w[0]?.toLocaleUpperCase("tr") ?? "") + w.slice(1)))
  })
})

describe("toSlug", () => {
  it("slugifies plain text", () => {
    expect(toSlug("Hello World")).toBe("hello-world")
    expect(toSlug("Hello, World!")).toBe("hello-world")
    expect(toSlug("  a  b  ")).toBe("a-b")
  })

  it("folds Turkish characters to ASCII", () => {
    expect(toSlug("Çağıl IŞIK Ü")).toBe("cagil-isik-u")
    expect(toSlug("İstanbul")).toBe("istanbul")
    expect(toSlug("şekerpare ğüşiöç")).toBe("sekerpare-gusioc")
  })

  it("collapses dashes and trims edges", () => {
    expect(toSlug("a---b___c")).toBe("a-b-c")
    expect(toSlug("---hello---")).toBe("hello")
    expect(toSlug("")).toBe("")
    expect(toSlug("---")).toBe("")
    expect(toSlug("!!!")).toBe("")
  })

  it("strips diacritics via NFD", () => {
    expect(toSlug("café naïve")).toBe("cafe-naive")
  })
})

describe("sortLines", () => {
  it("sorts ascending by default (case-insensitive)", () => {
    expect(sortLines("b\na\nc")).toBe("a\nb\nc")
    expect(sortLines("")).toBe("")
    expect(sortLines("only")).toBe("only")
  })

  it("sorts descending with desc:true", () => {
    expect(sortLines("a\nb\nc", { desc: true })).toBe("c\nb\na")
  })

  it("handles CRLF/CR line endings and rejoins with LF", () => {
    expect(sortLines("b\r\na\r\nc")).toBe("a\nb\nc")
    expect(sortLines("b\ra\nc")).toBe("a\nb\nc")
    expect(sortLines("b\na\rc")).not.toMatch(/\r/)
  })

  it("treats case-insensitively by default, sensitively on demand", () => {
    // Base sensitivity: "a" and "A" compare equal; stable order keeps input order.
    const mixed = sortLines("b\nA\na")
    expect(mixed.split("\n").sort()).toEqual(["A", "a", "b"].sort())
    // Case-sensitive path must not throw and must keep all lines.
    const sensitive = sortLines("b\nA\na", { caseSensitive: true }).split("\n")
    expect(sensitive).toHaveLength(3)
    expect([...sensitive].sort()).toEqual(["A", "a", "b"].sort())
  })
})

describe("dedupeLines", () => {
  it("removes duplicates preserving first-occurrence order", () => {
    expect(dedupeLines("b\na\nb\na\nc")).toBe("b\na\nc")
    expect(dedupeLines("")).toBe("")
    expect(dedupeLines("x")).toBe("x")
  })

  it("is case-sensitive by default", () => {
    expect(dedupeLines("a\nA\na")).toBe("a\nA")
  })

  it("folds case when caseSensitive=false, keeping the first form", () => {
    expect(dedupeLines("a\nA\nb", false)).toBe("a\nb")
    expect(dedupeLines("Hello\nhello\nHELLO\nworld", false)).toBe("Hello\nworld")
  })
})

describe("sortAndDedupeLines", () => {
  it("sorts then dedupes", () => {
    expect(sortAndDedupeLines("b\na\nb\nc\na")).toBe("a\nb\nc")
    expect(sortAndDedupeLines("")).toBe("")
  })
})

describe("cleanWhitespace", () => {
  it("applies the default full clean", () => {
    expect(cleanWhitespace("  hello   world  \n\n  foo  ")).toBe("hello world\nfoo")
    expect(cleanWhitespace("")).toBe("")
    expect(cleanWhitespace("   \n  \n ")).toBe("")
  })

  it("collapses inner spaces/tabs per line", () => {
    expect(cleanWhitespace("a  b\t\tc", {})).toBe("a b c")
  })

  it("respects opt-outs", () => {
    // Keep empty lines.
    expect(cleanWhitespace("a\n\nb", { removeEmptyLines: false })).toBe("a\n\nb")
    // Keep line padding (overall trim still applies to the outer string).
    expect(cleanWhitespace("  a  ", { trimLines: false, collapseSpaces: false, removeEmptyLines: false })).toBe("a")
    // Disable overall trim: leading/trailing empty lines survive as structure.
    expect(cleanWhitespace("\n\na\n\n", { removeEmptyLines: false, trimOverall: false })).toBe("\n\na\n\n")
    // Fully disabled: input passes through untouched.
    const raw = "  a  b  \n\n  c "
    expect(cleanWhitespace(raw, { trimLines: false, collapseSpaces: false, removeEmptyLines: false, trimOverall: false })).toBe(raw)
  })

  it("only collapses spaces/tabs, not newlines", () => {
    expect(cleanWhitespace("a\nb", {})).toBe("a\nb")
  })
})

describe("collapseWhitespace", () => {
  it("collapses every whitespace run to a single space and trims", () => {
    expect(collapseWhitespace("  hello   world  ")).toBe("hello world")
    expect(collapseWhitespace("a\n\tb\r\nc")).toBe("a b c")
    expect(collapseWhitespace("")).toBe("")
    expect(collapseWhitespace("   ")).toBe("")
  })
})

describe("base64", () => {
  it("round-trips UTF-8 (Turkish + emoji)", () => {
    for (const text of ["hello", "İstanbul ğüşiöç", "emoji 😀🎉", "a\nb\r\nc", ""]) {
      const encoded = base64Encode(text)
      const decoded = base64Decode(encoded)
      expect(decoded).toEqual({ ok: true, value: text })
    }
    expect(base64Encode("hello")).toBe("aGVsbG8=")
  })

  it("decodes empty/whitespace-only input as empty", () => {
    expect(base64Decode("")).toEqual({ ok: true, value: "" })
    expect(base64Decode("   ")).toEqual({ ok: true, value: "" })
  })

  it("rejects garbage without throwing", () => {
    expect(base64Decode("!!!")).toEqual({ ok: false, error: "Invalid Base64" })
    // Length % 4 === 1 can never be valid Base64.
    expect(base64Decode("a")).toEqual({ ok: false, error: "Invalid Base64" })
    expect(base64Decode("abcde")).toEqual({ ok: false, error: "Invalid Base64" })
    // Padding-only payload decodes to nothing valid via atob.
    expect(base64Decode("====")).toEqual({ ok: false, error: "Invalid Base64" })
  })

  it("tolerates surrounding whitespace on valid payloads", () => {
    expect(base64Decode("  aGVsbG8=  ")).toEqual({ ok: true, value: "hello" })
  })

  it("reports invalid when the decoder itself throws", () => {
    vi.stubGlobal("atob", () => {
      throw new Error("denied")
    })
    try {
      expect(base64Decode("aGVsbG8=")).toEqual({ ok: false, error: "Invalid Base64" })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("tool URL params", () => {
  it("validates tool ids", () => {
    for (const id of ["case", "lines", "ws", "b64", "diff"]) {
      expect(isToolId(id)).toBe(true)
    }
    expect(isToolId("nope")).toBe(false)
    expect(isToolId("")).toBe(false)
    expect(isToolId("CASE")).toBe(false)
  })

  it("parses only known tools", () => {
    expect(parseToolsUrlParams("?tool=diff")).toEqual({ tool: "diff" })
    expect(parseToolsUrlParams("?tool=nope")).toEqual({})
    expect(parseToolsUrlParams("")).toEqual({})
    expect(parseToolsUrlParams("?tab=tools")).toEqual({})
  })

  it("builds a ?tool= query string", () => {
    expect(buildToolsUrlParams("case")).toBe("?tool=case")
    expect(buildToolsUrlParams("diff")).toBe("?tool=diff")
  })
})

describe("diffLines", () => {
  it("handles empty inputs", () => {
    expect(diffLines("", "")).toEqual([])
    expect(diffLines("", "a\nb")).toEqual([
      { type: "added", text: "a" },
      { type: "added", text: "b" },
    ])
    expect(diffLines("a\nb", "")).toEqual([
      { type: "removed", text: "a" },
      { type: "removed", text: "b" },
    ])
  })

  it("marks identical lines unchanged", () => {
    expect(diffLines("a\nb", "a\nb")).toEqual([
      { type: "unchanged", text: "a" },
      { type: "unchanged", text: "b" },
    ])
  })

  it("emits added-then-removed for a single-line change", () => {
    // Tie-break in the implementation prefers "added" when both
    // continuations tie on LCS length.
    expect(diffLines("a\nb", "a\nc")).toEqual([
      { type: "unchanged", text: "a" },
      { type: "added", text: "c" },
      { type: "removed", text: "b" },
    ])
  })

  it("diffs multi-line edits and preserves blank-line text", () => {
    const before = "one\n\ntwo\nthree"
    const after = "one\nTWO\nthree\nfour"
    const rows = diffLines(before, after)
    expect(rows[0]).toEqual({ type: "unchanged", text: "one" })
    expect(rows[rows.length - 1]).toEqual({ type: "added", text: "four" })
    expect(rows).toContainEqual({ type: "unchanged", text: "three" })
    // Replaying the diff reconstructs both sides.
    expect(rows.filter((r) => r.type !== "added").map((r) => r.text).join("\n")).toBe(before)
    expect(rows.filter((r) => r.type !== "removed").map((r) => r.text).join("\n")).toBe(after)
  })

  it("treats CRLF/CR as line separators", () => {
    expect(diffLines("a\r\nb", "a\nb")).toEqual([
      { type: "unchanged", text: "a" },
      { type: "unchanged", text: "b" },
    ])
  })
})
