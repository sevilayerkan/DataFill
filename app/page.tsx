import FadelyTextUI from "@/components/FadelyTextUI";
import { aboutFaqs } from "@/lib/about";
import { siteUrl } from "@/lib/site";

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "FadelyText",
  url: `${siteUrl}/`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: ["en", "tr"],
  description:
    "Free online text toolkit: lorem ipsum generator, character and word counter, case converter, password generator, and fake name, email, address and phone data.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: aboutFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h1 className="sr-only">
        FadelyText – Free Lorem Ipsum Generator, Word Counter &amp; Fake Data
        Tools
      </h1>

      <FadelyTextUI />
    </>
  );
}
