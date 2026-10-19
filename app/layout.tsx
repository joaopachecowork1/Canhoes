import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import AppProviders from "@/components/providers/AppProviders";

import "./globals.css";

// The fonts are committed (Google Fonts' latin files), so the build never depends on reaching
// Google: a failed font download used to break `next build` in CI and on the server.
const barlowCondensed = localFont({
  src: [
    { path: "./fonts/barlow-condensed-600-latin.woff2", weight: "600" },
    { path: "./fonts/barlow-condensed-700-latin.woff2", weight: "700" },
    { path: "./fonts/barlow-condensed-800-latin.woff2", weight: "800" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const atkinson = localFont({
  src: [
    { path: "./fonts/atkinson-hyperlegible-400-latin.woff2", weight: "400" },
    { path: "./fonts/atkinson-hyperlegible-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-atkinson",
  display: "swap",
});

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: "Canh\u00f5es do Ano",
  description: "O ritual anual dos Canh\u00f5es: feed, vota\u00e7\u00f5es, nomea\u00e7\u00f5es e gala.",
  icons: {
    icon: "/brand/icon.svg",
    apple: "/brand/icon.svg",
    shortcut: "/brand/icon.svg",
  },
  openGraph: {
    title: "Canhões do Ano",
    description: "Premiando a comunidade com uma experiência clara, moderna e memorável.",
    images: ["/brand/hero.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Canhões do Ano",
    description: "Premiando a comunidade com uma experiência clara, moderna e memorável.",
    images: ["/brand/hero.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The font variables live on <html> so the :root tokens (--font-display, --font-body) can read them.
  return (
    <html lang="pt" suppressHydrationWarning data-scroll-behavior="smooth" className={`${barlowCondensed.variable} ${atkinson.variable}`}>
      <body
        className="min-h-screen antialiased [scrollbar-gutter:stable]"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
