"use client";

import { useCallback, useState } from "react";
import { trackSiteAction } from "../../lib/site-analytics";
import {
  getAppStoreUrl,
  getDownloadLinkUrl,
  getDirectInstallScriptCommand,
  getHomebrewInstallCommand
} from "../../lib/env";

const COPIED_RESET_MS = 1800;

function CopyCommand({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch(() => {
        /* clipboard unavailable — leave the text selectable */
      });
  }, [command]);

  return (
    <div className="termCommandRow">
      <span className="termCommandLabel">{label}</span>
      <code className="termCommandCode">{command}</code>
      <button className="termCopyButton" onClick={copy} type="button">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function AppStoreBadge({ href }: { href: string }) {
  return (
    <a
      onClick={() => trackSiteAction("download_clicked", "app_store")}
      aria-label="Download on the App Store"
      className="appStoreBadge"
      href={href}
    >
      <svg aria-hidden="true" fill="currentColor" height="26" viewBox="0 0 384 512" width="20">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span className="appStoreBadgeText">
        <small>Download on the</small>
        App Store
      </span>
    </a>
  );
}

/** The one install pair: direct Mac download first, App Store beside it. */
export function DownloadPair({ id }: { id?: string }) {
  return (
    <div className="heroDownloads" id={id} aria-label="Get Local AI Cat">
      <a className="heroDownloadMac" href={getDownloadLinkUrl()} onClick={() => trackSiteAction("download_clicked", "mac")}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>
        Download for Mac
      </a>
      <AppStoreBadge href={getAppStoreUrl()} />
    </div>
  );
}

export function CliInstall() {
  const [open, setOpen] = useState(false);
  const scriptCmd = getDirectInstallScriptCommand();
  const homebrewCmd = getHomebrewInstallCommand();

  return (
    <>
      <button
        aria-expanded={open}
        className="orCliToggle"
        onClick={() => setOpen(!open)}
        type="button"
      >
        …or install with the CLI or brew
        <svg
          aria-hidden="true"
          className={`orCliChevron ${open ? "isOpen" : ""}`}
          fill="none"
          height="14"
          viewBox="0 0 24 24"
          width="14"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {open && (
        <div className="termWindow termWindowReveal">
          <div className="termBar">
            <span aria-hidden="true" className="termDot termDotRed" />
            <span aria-hidden="true" className="termDot termDotYellow" />
            <span aria-hidden="true" className="termDot termDotGreen" />
            <span className="termTitle">Let the cat help you install it</span>
          </div>
          <video
            aria-label="Terminal recording of the one-line Local AI Cat install"
            autoPlay
            className="termVideo"
            loop
            muted
            playsInline
            src="/assets/install-demo.mp4"
          />
          <div className="termBody">
            {scriptCmd && <CopyCommand command={scriptCmd} label="script" />}
            {homebrewCmd && <CopyCommand command={homebrewCmd} label="brew" />}
          </div>
        </div>
      )}
    </>
  );
}
