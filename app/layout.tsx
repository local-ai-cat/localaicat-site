import type { Metadata } from "next";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getSiteUrl } from "../lib/env";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Local AI Cat - Private On-Device AI",
    template: "%s | Local AI Cat"
  },
  description:
    "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
  icons: {
    icon: [
      { url: "/assets/cat-business-favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/cat-business-favicon-192.png", type: "image/png", sizes: "192x192" }
    ],
    shortcut: [{ url: "/assets/cat-business-favicon-32.png", type: "image/png" }],
    apple: [{ url: "/assets/cat-business-favicon-180.png", sizes: "180x180", type: "image/png" }]
  },
  other: {
    "theme-color": "#090909"
  },
  openGraph: {
    title: "Local AI Cat - Private On-Device AI",
    description:
      "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
    url: getSiteUrl(),
    siteName: "Local AI Cat",
    images: [{ url: "/assets/og-share.png", width: 1200, height: 630 }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Local AI Cat - Private On-Device AI",
    description:
      "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
    images: [{ url: "/assets/og-share.png", width: 1200, height: 630 }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${displayFont.variable} ${bodyFont.variable}`} lang="en">
      <head>
        <meta name="apple-itunes-app" content="app-id=6741502386" />
        <link rel="preconnect" href="https://app.chatwoot.com" />
        <link rel="dns-prefetch" href="https://app.chatwoot.com" />
      </head>
      <body>
        {children}
        <SpeedInsights />
        <Script src="/js/cookie-consent.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
