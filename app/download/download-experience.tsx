"use client";

import Link from "next/link";

type DownloadExperienceProps = {
  downloadUrl: string | null;
  version: string | null;
  filename: string | null;
  sha256: string | null;
  homebrewCmd: string;
  scriptCmd: string;
  appStoreUrl: string;
};

export function DownloadExperience({
  downloadUrl,
  version,
  sha256,
  homebrewCmd,
  scriptCmd,
  appStoreUrl
}: DownloadExperienceProps) {
  return (
    <div className="downloadPaths">
      {/* ─── Outdoor Cat / direct path ─── */}
      <article className="downloadPath downloadPathStrong">
        <p className="downloadPathEyebrow">Outdoor Cat</p>
        <h3>Direct download for Mac.</h3>
        <p className="downloadPathBody">
          Web billing and the full macOS feature set, including desktop tools
          that are limited in the sandboxed App Store build.
        </p>

        <div className="downloadStack">
          <a
            className="planButton"
            href={downloadUrl || "#"}
            {...(downloadUrl ? {} : { "aria-disabled": true })}
          >
            Download .dmg
          </a>

          {version && (
            <p className="downloadVersion">Version {version}</p>
          )}

          {scriptCmd && (
            <div className="commandSection">
              <p className="commandLabel">Or install via script:</p>
              <pre className="commandBlock">
                <code>{scriptCmd}</code>
              </pre>
            </div>
          )}

          {homebrewCmd && (
            <div className="commandSection">
              <p className="commandLabel">Or via Homebrew:</p>
              <pre className="commandBlock">
                <code>{homebrewCmd}</code>
              </pre>
            </div>
          )}

          {sha256 && (
            <p className="downloadSha">
              SHA-256: <code>{sha256}</code>
            </p>
          )}
        </div>

        <div className="downloadPathFooter">
          <Link className="secondaryButton" href="/pricing/direct">
            See pricing
          </Link>
        </div>
      </article>

      {/* ─── Indoor Cat / App Store path ─── */}
      <article className="downloadPath">
        <p className="downloadPathEyebrow">Indoor Cat</p>
        <h3>App Store for iPhone, iPad, and Mac.</h3>
        <p className="downloadPathBody">
          Apple billing and the simplest install path. On Mac, sandboxing
          limits some desktop features such as controlling other app windows.
        </p>
        <div className="downloadPathActions">
          <a href={appStoreUrl}>
            <img
              src="https://tools.applemediaservices.com/api/badges/download-on-the-mac-app-store/black/en-us?size=250x83"
              alt="Download on the Mac App Store"
              style={{ height: 48 }}
            />
          </a>
        </div>
      </article>
    </div>
  );
}
