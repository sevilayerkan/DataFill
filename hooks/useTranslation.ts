"use client"

import en from "@/locales/en.json";
import tr from "@/locales/tr.json";

type Language = "en" | "tr";
type TranslationKey = string;
type Translations = Record<string, string>;

const translations: Record<Language, Translations> = { en, tr };

export function useTranslation(language: Language) {
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let translation = translations[language]?.[key] || key

    // Simple interpolation for {{variable}} syntax
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{{${paramKey}}}`, String(value))
      })
    }

    return translation
  }

  return { t }
}
