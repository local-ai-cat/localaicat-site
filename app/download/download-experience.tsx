"use client";

import { useState } from "react";

function CopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="commandBlockWrap">
      <pre className="commandBlock">
        <code>{command}</code>
      </pre>
      <button
        className="copyButton"
        onClick={handleCopy}
        type="button"
        aria-label="Copy to clipboard"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

type InstallMethod = "dmg" | "brew" | "script";

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
  const [method, setMethod] = useState<InstallMethod>("dmg");

  const methods: { id: InstallMethod; label: string }[] = [
    { id: "dmg", label: ".dmg" },
    { id: "brew", label: "Homebrew" },
    { id: "script", label: "Script" }
  ];

  return (
    <div className="downloadPaths">
      {/* ─── Outdoor Cat / direct path ─── */}
      <article className="downloadPath">
        <p className="downloadPathEyebrow">Outdoor Cat</p>
        <h3>Direct download for Mac.</h3>
        <p className="downloadPathBody">
          Web billing and the full macOS feature set, including desktop tools
          that are limited in the sandboxed App Store build.
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
          {method === "dmg" && (
            <>
              <a
                className="planButton"
                href={downloadUrl || "#"}
                {...(downloadUrl ? {} : { "aria-disabled": true })}
              >
                Download .dmg
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
            <div className="comingSoon">
              <CopyBlock command={homebrewCmd} />
              <p className="comingSoonLabel">Coming soon</p>
            </div>
          )}

          {method === "script" && (
            <CopyBlock command={scriptCmd} />
          )}
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
