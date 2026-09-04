import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { siteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

const title = "FadelyText";
const description =
  "FadelyText is a text toolkit and fake data generator: lorem ipsum, character/word counter, email, name, address, phone and password generation. Available in English and Turkish.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  keywords: [
    "text tools",
    "lorem ipsum generator",
    "character counter",
    "word counter",
    "fake data generator",
    "email generator",
    "password generator",
  ],
  authors: [{ name: title }],
  creator: title,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      {
        url: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: title,
    locale: "en_US",
    alternateLocale: ["tr_TR"],
    url: "/",
    title,
    description,
    images: [
      {
        url: "/apple-icon.png",
        width: 180,
        height: 180,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/apple-icon.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#DDDAD0" },
    { media: "(prefers-color-scheme: dark)", color: "#202329" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-h-screen flex-col items-center justify-center p-4 outline-none sm:p-8"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
