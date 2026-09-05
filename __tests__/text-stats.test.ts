import { describe, it, expect } from "vitest"
import { countLines, countWords, getTextStats } from "../lib/text-stats"

describe("countWords", () => {
  it("counts plain words", () => {
    expect(countWords("Hello World! This is a test.")).toBe(6)
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
  })

  it("splits on no-break spaces", () => {
    expect(countWords("hello\u00A0world")).toBe(2)
  })

  it("counts CJK text without spaces", () => {
    expect(countWords("日本語テスト")).toBe(2)
    expect(countWords("你好世界")).toBe(2)
  })
})

describe("countLines", () => {
  it("counts CRLF/CR/LF and Unicode separators", () => {
    expect(countLines("")).toBe(0)
    expect(countLines("one")).toBe(1)
    expect(countLines("a\nb\r\nc\rd")).toBe(4)
    expect(countLines("a\u2028b\u2029c")).toBe(3)
  })
})

describe("getTextStats", () => {
  it("counts astral characters once", () => {
    expect(getTextStats("a😀")).toEqual({ characters: 2, words: 1, lines: 1 })
  })

  it("derives the counter-tab fixture", () => {
    expect(getTextStats("Hello\nWorld!\nThis is a test.")).toEqual({
      characters: 28,
      words: 6,
      lines: 3,
    })
  })
})
