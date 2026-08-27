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
    "Download the Local AI Cat Outdoor Cat build for macOS. Full desktop features and web billing."
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
        kicker="Outdoor Cat"
        title="Direct download for Mac"
      >
        <section className="contentCard contentCardTight">
          <h2>Download</h2>
          <p>
            Outdoor Cat is the direct-download Mac build — the one we recommend.
            No sandbox means the complete desktop feature set, including tools
            the App Store build can&apos;t offer. Signed and notarized by Apple.
          </p>
          <div className="routeActions">
            {downloadUrl ? (
              <a className="planButton" href={downloadUrl}>
                Download the DMG
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
            <>
              <p className="downloadOptionLabel">Or install from the terminal:</p>
              <pre className="commandBlock">
                <code>{scriptCmd}</code>
              </pre>
              <div className="braveVideoFrame">
                <video
                  aria-label="Terminal recording of the one-line Local AI Cat install"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="/assets/install-demo.mp4"
                />
              </div>
            </>
          )}

          {homebrewCmd && (
            <>
              <p className="downloadOptionLabel">Or with Homebrew:</p>
              <pre className="commandBlock">
                <code>{homebrewCmd}</code>
              </pre>
            </>
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
