import type { Metadata } from "next";
import { getAppStoreUrl, getDirectDownloadUrl, getSiteUrl } from "../../lib/env";
import { jsonLdScript, softwareApplicationJsonLd } from "../../lib/structured-data";
import { SiteShell } from "../_components/site-shell";
import { PricingExperience } from "./pricing-experience";

export const metadata: Metadata = {
  title: "Pricing: free, or Pro from £4 a month",
  description:
    "Start free with Local AI Cat. Buy Pro Monthly, Pro Annual or the one-time Developer Mode upgrade for Mac."
};

export default function PricingPage() {
  return (
    <SiteShell>
      <script
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(softwareApplicationJsonLd({
            siteUrl: getSiteUrl(),
            appStoreUrl: getAppStoreUrl(),
            downloadUrl: getDirectDownloadUrl()
          }))
        }}
        type="application/ld+json"
      />
      <PricingExperience />
    </SiteShell>
  );
}
