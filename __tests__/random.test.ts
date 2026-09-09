import { describe, it, expect, vi, afterEach } from "vitest"
import { randomInt, randomUUID } from "../lib/random"
import { generateTCKN, takeUnique } from "../components/MiscGenerator"
import { generatePhoneNumber, getPhoneCountry } from "../data/phone-data"

/** Deterministic LCG for injected-source tests. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

describe("randomInt", () => {
  it("returns 0 for non-positive bounds", () => {
    expect(randomInt(0)).toBe(0)
    expect(randomInt(-5)).toBe(0)
  })

  it("stays within bounds on the crypto path", () => {
    for (let i = 0; i < 200; i++) {
      const value = randomInt(10)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it("scales an injected source deterministically", () => {
    const first = takeUnique([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, lcg(42))
    const second = takeUnique([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, lcg(42))
    expect(first).toEqual(second)
    expect(first).toHaveLength(5)
    expect(new Set(first).size).toBe(5)
  })
})

describe("generateTCKN", () => {
  it("produces valid checksums with injected randomness", () => {
    for (const seed of [1, 7, 12345]) {
      const tckn = generateTCKN(lcg(seed))
      expect(tckn).toMatch(/^[1-9]\d{10}$/)
      const digits = tckn.split("").map(Number)
      const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
      const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
      expect(digits[9]).toBe(((oddSum * 7 - evenSum) % 10 + 10) % 10)
      expect(digits[10]).toBe(digits.slice(0, 10).reduce((sum, d) => sum + d, 0) % 10)
    }
  })
})

describe("generatePhoneNumber", () => {
  it("is deterministic with an injected source", () => {
    const country = getPhoneCountry("TR")
    expect(generatePhoneNumber(country, lcg(9))).toBe(generatePhoneNumber(country, lcg(9)))
    expect(generatePhoneNumber(country, lcg(9))).toMatch(/^\+905\d{9}$/)
  })
})

describe("randomUUID", () => {
  it("returns unique v4-shaped ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => randomUUID()))
    expect(ids.size).toBe(50)
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    }
  })
})

describe("non-WebCrypto fallbacks", () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto")

  afterEach(() => {
    vi.unstubAllGlobals()
    if (cryptoDescriptor) Object.defineProperty(globalThis, "crypto", cryptoDescriptor)
  })

  it("scales Math.random for randomInt without crypto", () => {
    vi.stubGlobal("crypto", undefined)
    for (let i = 0; i < 50; i++) {
      const value = randomInt(10)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it("encodes v4 manually with getRandomValues-only crypto", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i
        return arr
      },
    })
    expect(randomUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it("falls back to the Math.random template without any crypto", () => {
    vi.stubGlobal("crypto", undefined)
    expect(randomUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it("treats unreadable crypto as absent", () => {
    Object.defineProperty(globalThis, "crypto", {
      get() {
        throw new Error("denied")
      },
      configurable: true,
    })
    expect(randomInt(5)).toBeLessThan(5)
    expect(randomUUID()).toMatch(/-4[0-9a-f]{3}-/)
  })
})
