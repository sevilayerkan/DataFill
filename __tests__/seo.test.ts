import { describe, it, expect } from "vitest"
import sitemap from "../app/sitemap"
import robots from "../app/robots"
import { siteUrl } from "../lib/site"

describe("sitemap", () => {
  it("exposes the homepage as a weekly entry", () => {
    const entries = sitemap()
    expect(entries).toHaveLength(1)
    expect(entries[0].url).toBe(`${siteUrl}/`)
    expect(entries[0].changeFrequency).toBe("weekly")
    expect(entries[0].priority).toBe(1)
    expect(entries[0].lastModified).toBeInstanceOf(Date)
  })
})

describe("robots", () => {
  it("allows all agents and points at the sitemap", () => {
    expect(robots()).toEqual({
      rules: [{ userAgent: "*", allow: "/" }],
      sitemap: `${siteUrl}/sitemap.xml`,
    })
  })
})
