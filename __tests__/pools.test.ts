import { describe, it, expect } from "vitest"
import {
  datePool,
  fullNamePool,
  passwordPool,
  sampleUnique,
} from "../components/MiscGenerator"

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

describe("pool memoization", () => {
  it("reuses the full-name pool per language and gender", () => {
    expect(fullNamePool("en")).toBe(fullNamePool("en"))
    expect(fullNamePool("en", "male")).toBe(fullNamePool("en", "male"))
    expect(fullNamePool("tr")).toBe(fullNamePool("tr"))
    expect(fullNamePool("en", "male")).not.toBe(fullNamePool("en", "female"))
  })

  it("reuses the password pool per language", () => {
    expect(passwordPool("en")).toBe(passwordPool("en"))
    expect(passwordPool("tr")).toBe(passwordPool("tr"))
  })

  it("builds the date pool once per day and accepts an explicit date", () => {
    expect(datePool()).toBe(datePool())
    const fixed = new Date(2026, 0, 15)
    const pool = datePool(fixed)
    expect(datePool(fixed)).toBe(pool)
    expect(pool).toHaveLength(2000)
    expect(pool[0]).toBe("2026-01-15")
    expect(pool[1]).toBe("2026-01-16")
  })
})

describe("sampleUnique", () => {
  it("returns up to n unique pool members", () => {
    const pool = Array.from({ length: 2000 }, (_, i) => `item-${i}`)
    const sample = sampleUnique(pool, 500)
    expect(sample).toHaveLength(500)
    expect(new Set(sample).size).toBe(500)
    for (const item of sample) {
      expect(pool).toContain(item)
    }
  })

  it("caps at the pool size with a full permutation", () => {
    const pool = ["a", "b", "c"]
    expect(sampleUnique(pool, 10)).toHaveLength(3)
    expect([...sampleUnique(pool, 10)].sort()).toEqual(["a", "b", "c"])
    expect(sampleUnique(pool, 0)).toEqual([])
  })

  it("never mutates the pool", () => {
    const pool = [1, 2, 3, 4, 5]
    sampleUnique(pool, 3)
    expect(pool).toEqual([1, 2, 3, 4, 5])
  })

  it("is deterministic with an injected source", () => {
    const pool = Array.from({ length: 100 }, (_, i) => i)
    expect(sampleUnique(pool, 10, lcg(7))).toEqual(sampleUnique(pool, 10, lcg(7)))
  })
})
