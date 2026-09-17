"use client";

import { useTranslation, type Language } from "@/hooks/useTranslation";

const faqKeys = [
  ["aboutFaq1Q", "aboutFaq1A"],
  ["aboutFaq2Q", "aboutFaq2A"],
  ["aboutFaq3Q", "aboutFaq3A"],
  ["aboutFaq4Q", "aboutFaq4A"],
  ["aboutFaq5Q", "aboutFaq5A"],
] as const;

export function AboutPanel({ language }: { language: Language }) {
  const { t } = useTranslation(language);

  return (
    <div className="space-y-5 text-left">
      <section aria-labelledby="about-features-heading">
        <h2
          id="about-features-heading"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t("aboutFeaturesTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6">{t("aboutIntro")}</p>
        <ul className="mt-3 grid gap-3 text-sm leading-6 sm:grid-cols-2">
          <li className="rounded-lg border p-3">
            <strong className="block text-foreground">
              {t("aboutCardLoremTitle")}
            </strong>
            {t("aboutCardLoremDesc")}
          </li>
          <li className="rounded-lg border p-3">
            <strong className="block text-foreground">
              {t("aboutCardCounterTitle")}
            </strong>
            {t("aboutCardCounterDesc")}
          </li>
          <li className="rounded-lg border p-3">
            <strong className="block text-foreground">
              {t("aboutCardCleanupTitle")}
            </strong>
            {t("aboutCardCleanupDesc")}
          </li>
          <li className="rounded-lg border p-3">
            <strong className="block text-foreground">
              {t("aboutCardFakeTitle")}
            </strong>
            {t("aboutCardFakeDesc")}
          </li>
        </ul>
      </section>

      <section aria-labelledby="about-faq-heading">
        <h2
          id="about-faq-heading"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t("aboutFaqTitle")}
        </h2>
        <div className="mt-3 space-y-3">
          {faqKeys.map(([q, a]) => (
            <details
              key={q}
              className="rounded-lg border p-3 text-sm leading-6"
            >
              <summary className="cursor-pointer font-medium text-foreground">
                {t(q)}
              </summary>
              <p className="mt-2">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
