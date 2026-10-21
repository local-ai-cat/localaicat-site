import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getSiteUrl } from "../lib/env";
import { spaceSharingMetadata } from "../lib/space-sharing";
import { initialModeScript } from "../lib/site-personality";
import { SiteAnalytics } from "./_components/site-analytics";
import { ExplorerProvider } from "./_components/explorer-presence";
import { GoatCounter } from "./goat-counter";
import { SiteSpeedInsights } from "./_components/site-speed-insights";
import { SupportChat } from "./_components/support-chat";
import "./globals.css";
import "./space-theme.css";

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
  ...spaceSharingMetadata(getSiteUrl(), process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined),
  robots: {
    index: process.env.VERCEL_ENV !== "preview" && ["localaicat.com", "www.localaicat.com"].includes(new URL(getSiteUrl()).hostname),
    follow: true
  },
  // Each page names its one address, so apex, www and ?mode= links count as the same page.
  alternates: { canonical: "./" },
  title: {
    default: "Local AI Cat: Private On-Device AI for Mac, iPhone & iPad",
    template: "%s | Local AI Cat"
  },
  description:
    "Private, on-device AI chat and transcription for iPhone, iPad, and Mac. No cloud required.",
  icons: {
    icon: [
      { url: "/space-demo/cadet-icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/space-demo/cadet-icon.svg", type: "image/svg+xml", sizes: "any" }
    ],
    shortcut: [{ url: "/space-demo/cadet-icon-32.png", type: "image/png" }],
    apple: [{ url: "/space-demo/cadet-touch-180.png", sizes: "180x180", type: "image/png" }]
  },
  other: {
    "theme-color": "#17131f"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // initialModeScript may switch the world attributes before hydration, so they can differ from the server's.
    <html data-personality="space" data-scroll-behavior="smooth" className={`${displayFont.variable} ${bodyFont.variable}`} lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-itunes-app" content="app-id=6741502386" />
      </head>
      <body data-home-mode="space" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: initialModeScript }} />
        <ExplorerProvider>{children}</ExplorerProvider>
        <SiteAnalytics />
        <SiteSpeedInsights />
        <GoatCounter />
        <SupportChat />
      </body>
    </html>
  );
}
