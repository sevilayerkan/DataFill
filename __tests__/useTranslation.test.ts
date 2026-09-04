import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import "@testing-library/jest-dom"
import en from "../locales/en.json"
import tr from "../locales/tr.json"
import { interpolate, useTranslation } from "../hooks/useTranslation"

describe("i18n single source", () => {
  it("exposes identical keys in English and Turkish", () => {
    expect(new Set(Object.keys(tr))).toEqual(new Set(Object.keys(en)))
  })

  it("interpolates params", () => {
    const { result } = renderHook(() => useTranslation("en"))
    expect(result.current.t("charactersCount", { count: 3 })).toBe("Characters: 3")
  })

  it("resolves misc labels from the same locale tables", () => {
    const { result: enResult } = renderHook(() => useTranslation("en"))
    const { result: trResult } = renderHook(() => useTranslation("tr"))
    expect(enResult.current.t("miscGenerate")).toBe("Generate")
    expect(trResult.current.t("miscGenerate")).toBe("Üret")
    expect(enResult.current.t("miscTckn")).toBe("TCKN (TR ID)")
    expect(trResult.current.t("miscTckn")).toBe("TCKN")
  })
})

describe("interpolate", () => {
  it("replaces every occurrence of a placeholder", () => {
    expect(interpolate("{{n}} of {{n}}", { n: 2 })).toBe("2 of 2")
  })

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Hello {{name}}", {})).toBe("Hello {{name}}")
  })
})
