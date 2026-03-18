"use client";

import { useState } from "react";
import Link from "next/link";

type InstallMethod = "pkg" | "brew" | "script";

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
  filename,
  sha256,
  homebrewCmd,
  scriptCmd,
  appStoreUrl
}: DownloadExperienceProps) {
  const [method, setMethod] = useState<InstallMethod>("pkg");

  const methods: { id: InstallMethod; label: string }[] = [
    { id: "pkg", label: ".pkg" },
    { id: "brew", label: "Homebrew" },
    { id: "script", label: "Script" }
  ];

  return (
    <div className="downloadPaths">
      {/* ─── Full Mac path ─── */}
      <article className="downloadPath downloadPathStrong">
        <p className="downloadPathEyebrow">Direct download</p>
        <h3>Full Mac path.</h3>
        <p className="downloadPathBody">
          Direct billing, full macOS features, and the foundation for Team and
          Enterprise.
        </p>

        <div className="installToggle">
          {methods.map((m) => (
            <button
              className={`installToggleBtn${method === m.id ? " installToggleBtnActive" : ""}`}
              key={m.id}
              onClick={() => setMethod(m.id)}
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="installPanel">
          {method === "pkg" && (
            <>
              <a
                className="planButton"
                href={downloadUrl || "#"}
                {...(downloadUrl ? {} : { "aria-disabled": true })}
              >
                Download .pkg
              </a>
              {(version || filename || sha256) && (
                <ul className="installMeta">
                  {version && <li>Version {version}</li>}
                  {filename && <li>{filename}</li>}
                  {sha256 && (
                    <li>
                      SHA-256: <code>{sha256}</code>
                    </li>
                  )}
                </ul>
              )}
            </>
          )}

          {method === "brew" && (
            <pre className="commandBlock">
              <code>{homebrewCmd}</code>
            </pre>
          )}

          {method === "script" && (
            <pre className="commandBlock">
              <code>{scriptCmd}</code>
            </pre>
          )}
        </div>

        <div className="downloadPathFooter">
          <Link className="secondaryButton" href="/pricing/direct">
            See pricing
          </Link>
        </div>
      </article>

      {/* ─── App Store path ─── */}
      <article className="downloadPath">
        <p className="downloadPathEyebrow">App Store</p>
        <h3>Simple install.</h3>
        <p className="downloadPathBody">
          Apple billing, sandboxed. Best for iPhone, iPad, and a quick Mac
          install.
        </p>
        <div className="downloadPathActions">
          <a className="planButton" href={appStoreUrl}>
            Open App Store
          </a>
          <Link className="secondaryButton" href="/pricing/app-store">
            See pricing
          </Link>
        </div>
      </article>
    </div>
  );
}
