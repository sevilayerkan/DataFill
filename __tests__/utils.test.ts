import { describe, it, expect } from "vitest"
import { cn } from "../lib/utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b")
    expect(cn("")).toBe("")
  })

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })

  it("merges conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("text-sm text-lg font-bold")).toBe("text-lg font-bold")
  })

  it("supports objects and arrays", () => {
    expect(cn({ a: true, b: false })).toBe("a")
    expect(cn(["a", "b"])).toBe("a b")
    expect(cn("p-1", { "p-2": true }, ["m-1"])).toBe("p-2 m-1")
  })
})
