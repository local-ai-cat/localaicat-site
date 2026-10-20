import type { Metadata } from "next";
import { getAppStoreUrl, getDirectDownloadUrl, getSiteUrl } from "../lib/env";
import { homeShareCopy, spaceSharingMetadata } from "../lib/space-sharing";
import { jsonLdScript, softwareApplicationJsonLd } from "../lib/structured-data";
import { HomeExperience } from "./_components/home-experience";
import { SiteShell } from "./_components/site-shell";

export const metadata: Metadata = spaceSharingMetadata(
  getSiteUrl(),
  process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_URL : undefined,
  homeShareCopy
);

export default function HomePage() {
  const jsonLd = softwareApplicationJsonLd({
    siteUrl: getSiteUrl(),
    appStoreUrl: getAppStoreUrl(),
    downloadUrl: getDirectDownloadUrl()
  });
  return (
    <SiteShell showWorldSelector={false}>
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} type="application/ld+json" />
      <HomeExperience />
    </SiteShell>
  );
}
