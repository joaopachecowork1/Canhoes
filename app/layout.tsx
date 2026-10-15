import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import AppProviders from "@/components/providers/AppProviders";

import "./globals.css";

// The fonts are committed (Google Fonts' latin variable files), so the build never depends on
// reaching Google: a failed font download used to break `next build` in CI and on the server.
const orbitron = localFont({
  src: "./fonts/orbitron-latin.woff2",
  variable: "--font-orbitron",
  weight: "700 900",
  display: "swap",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "400 700",
  display: "swap",
});

const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 600",
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
    title: "Canhoes do Ano",
    description: "Premiando a comunidade com uma experiencia clara, moderna e memoravel.",
    images: ["/brand/hero.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Canhoes do Ano",
    description: "Premiando a comunidade com uma experiencia clara, moderna e memoravel.",
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
  return (
    <html lang="pt" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${orbitron.variable} ${dmSans.variable} ${jetBrainsMono.variable} min-h-screen antialiased [scrollbar-gutter:stable]`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
