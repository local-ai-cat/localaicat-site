import type { Metadata } from "next";
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
    icon: "/assets/cat-business.png"
  },
  other: {
    "theme-color": "#090909",
    "apple-itunes-app": "app-id=6741502386"
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
      <body>{children}</body>
    </html>
  );
}
