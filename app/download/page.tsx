import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import { DownloadExperience } from "./download-experience";
import {
  getAppStoreUrl,
  getDirectDownloadFilename,
  getDirectDownloadSha256,
  getDirectDownloadUrl,
  getDirectDownloadVersion,
  getDirectInstallScriptCommand,
  getHomebrewInstallCommand
} from "../../lib/env";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download Local AI Cat: direct build for macOS or App Store for iPhone, iPad, and Mac."
};

const DEFAULT_BREW_CMD = "brew install --cask local-ai-cat";

export default function DownloadPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="The base app is free on both paths. Install first, upgrade when you're ready."
        kicker="Download"
        title="Get started"
      >
        <DownloadExperience
          appStoreUrl={getAppStoreUrl()}
          downloadUrl={getDirectDownloadUrl()}
          filename={getDirectDownloadFilename()}
          homebrewCmd={getHomebrewInstallCommand() || DEFAULT_BREW_CMD}
          scriptCmd={getDirectInstallScriptCommand()}
          sha256={getDirectDownloadSha256()}
          version={getDirectDownloadVersion()}
        />
      </ContentPage>
    </SiteShell>
  );
}
