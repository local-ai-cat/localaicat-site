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
    icon: "/assets/app-icon.png"
  },
  openGraph: {
    title: "Local AI Cat - Private On-Device AI",
    description:
      "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
    url: getSiteUrl(),
    siteName: "Local AI Cat",
    images: ["/assets/app-icon.png"],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Local AI Cat - Private On-Device AI",
    description:
      "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
    images: ["/assets/app-icon.png"]
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
