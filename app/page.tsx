import { HomeExperience } from "./_components/home-experience";
import { SiteShell } from "./_components/site-shell";

/* Static JSON-LD structured data for search engines (no user input, safe to inline) */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Local AI Cat",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "iOS 17+, iPadOS 17+, macOS 14+",
  description:
    "Private, on-device AI chat and transcription for Apple devices. No cloud required.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free base app with optional Pro upgrade"
  },
  url: "https://localaicat.com"
};

export default function HomePage() {
  return (
    <SiteShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <HomeExperience />
    </SiteShell>
  );
}
