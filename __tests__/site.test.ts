import { describe, it, expect, vi, afterEach } from "vitest"

const KEY = "NEXT_PUBLIC_SITE_URL"

describe("siteUrl", () => {
  const orig = process.env[KEY]

  afterEach(() => {
    if (orig === undefined) delete process.env[KEY]
    else process.env[KEY] = orig
    vi.resetModules()
  })

  it("falls back to localhost when the env var is unset", async () => {
    delete process.env[KEY]
    vi.resetModules()
    const { siteUrl } = await import("../lib/site")
    expect(siteUrl).toBe("http://localhost:3000")
  })

  it("uses NEXT_PUBLIC_SITE_URL when set", async () => {
    process.env[KEY] = "https://fadelytext.vercel.app"
    vi.resetModules()
    const { siteUrl } = await import("../lib/site")
    expect(siteUrl).toBe("https://fadelytext.vercel.app")
  })
})
