"use client"

import en from "@/locales/en.json";
import tr from "@/locales/tr.json";

export type Language = "en" | "tr";

/** Single source of truth: every key must exist in `locales/en.json`. */
export type TranslationKey = keyof typeof en;

type TranslationTable = Record<TranslationKey, string>;

const translations: Record<Language, TranslationTable> = { en, tr };

/** Global interpolation for {{variable}} syntax (replaces every occurrence). */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (text, [paramKey, value]) => text.split(`{{${paramKey}}}`).join(String(value)),
    template,
  )
}

export function useTranslation(language: Language) {
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Fall back to English, then to the raw key (typed keys make this unreachable in practice).
    const template = translations[language]?.[key] ?? en[key] ?? key

    return params ? interpolate(template, params) : template
  }

  return { t }
}
