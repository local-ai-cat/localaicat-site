import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../../_components/content-page";
import { SiteShell } from "../../_components/site-shell";
import {
  getDirectDownloadFilename,
  getDirectInstallScriptCommand,
  getDirectDownloadSha256,
  getDirectDownloadUrl,
  getDirectDownloadVersion,
  getHomebrewInstallCommand
} from "../../../lib/env";

export const metadata: Metadata = {
  title: "Direct Download",
  description:
    "Download the Local AI Cat direct build for macOS. Full features, direct billing, and the path for Team and Enterprise."
};

export default function DirectDownloadPage() {
  const downloadUrl = getDirectDownloadUrl();
  const version = getDirectDownloadVersion();
  const filename = getDirectDownloadFilename();
  const sha256 = getDirectDownloadSha256();
  const homebrewCmd = getHomebrewInstallCommand();
  const scriptCmd = downloadUrl ? getDirectInstallScriptCommand() : null;

  return (
    <SiteShell>
      <ContentPage
        intro="Install the free macOS build. Upgrade to Pro or Developer Mode on the web when you're ready, then activate your license key in Settings."
        kicker="Direct Download"
        title="Direct path"
      >
        <section className="contentCard contentCardTight">
          <h2>Download</h2>
          <div className="routeActions">
            {downloadUrl ? (
              <a className="planButton" href={downloadUrl}>
                Download for Mac
              </a>
            ) : (
              <span className="secondaryButton secondaryButtonStatic">
                Coming soon
              </span>
            )}
            <Link className="secondaryButton" href="/pricing/direct">
              See pricing
            </Link>
          </div>

          {scriptCmd && (
            <pre className="commandBlock">
              <code>{scriptCmd}</code>
            </pre>
          )}

          {homebrewCmd && (
            <pre className="commandBlock">
              <code>{homebrewCmd}</code>
            </pre>
          )}

          {(version || filename || sha256) && (
            <ul className="contentMetaList">
              {version && <li>Version: {version}</li>}
              {filename && <li>File: {filename}</li>}
              {sha256 && (
                <li>
                  SHA-256: <code>{sha256}</code>
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="contentCard">
          <h2>After installing</h2>
          <ol className="contentOrderedList">
            <li>Open the app — it works free out of the box.</li>
            <li>
              When you want Pro or Developer Mode, buy on the{" "}
              <Link className="textLink" href="/pricing/direct">
                pricing page
              </Link>
              .
            </li>
            <li>Paste the license key you receive into Settings to activate.</li>
          </ol>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
