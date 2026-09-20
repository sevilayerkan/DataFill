import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { siteUrl } from "@/lib/site";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

const brand = "DataFill";
const title =
  "DataFill – Free Lorem Ipsum Generator, Word Counter & Fake Data Tools";
const description =
  "Free online text toolkit: lorem ipsum generator, character & word counter, case converter, password generator, and fake name, email, address & phone data. No sign-up, works in English and Turkish.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${brand}`,
  },
  description,
  keywords: [
    "lorem ipsum generator",
    "word counter",
    "character counter",
    "text tools",
    "case converter",
    "fake data generator",
    "fake name generator",
    "email generator",
    "password generator",
    "address generator",
    "phone number generator",
  ],
  authors: [{ name: brand }],
  creator: brand,
  publisher: brand,
  category: "technology",
  applicationName: brand,
  appleWebApp: {
    capable: true,
    title: brand,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
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
    siteName: brand,
    locale: "en_US",
    alternateLocale: ["tr_TR"],
    url: "/",
    title,
    description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
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
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className={inter.className}>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
