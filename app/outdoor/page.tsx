import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import {
  getDirectDownloadUrl,
  getDirectDownloadVersion,
  getHomebrewInstallCommand
} from "../../lib/env";

export const metadata: Metadata = {
  title: "Outdoor Cat",
  description:
    "The direct-download edition of Local AI Cat for macOS: everything in the App Store build, plus the capabilities that need to live outside the App Sandbox."
};

const DEFAULT_BREW_CMD = "brew install --cask local-ai-cat";

export default function OutdoorPage() {
  const downloadUrl = getDirectDownloadUrl();
  const version = getDirectDownloadVersion();
  const brewCmd = getHomebrewInstallCommand() || DEFAULT_BREW_CMD;

  return (
    <SiteShell>
      <ContentPage
        intro="Outdoor Cat is the direct-download macOS edition. Same app, same on-device models, same privacy — plus the capabilities that need deeper system access than the Mac App Store sandbox permits."
        kicker="Outdoor Cat"
        title="The full-freedom edition"
      >
        <div className="dualCards" style={{ maxWidth: 720 }}>
          <article className="dualCard dualCardStrong">
            <p className="dualCardEyebrow">Only in Outdoor</p>
            <h3>What the extra freedom buys.</h3>
            <p className="dualCardBody">
              These features require system access that sandboxed apps
              cannot use, so they ship only in the direct-download build.
            </p>
            <ul className="dualCardList">
              <li>
                Reliable lid-closed mode — a one-time admin install lets
                Screen Awake hold your Mac awake through a closed lid, even
                on battery
              </li>
              <li>Auto-paste transcription into the app you’re working in</li>
              <li>Window management and force-quit for other apps</li>
              <li>Keyboard backlight control</li>
              <li>
                The full Compute / Model Link surface: remote cat, P2P,
                screen + audio, SSH
              </li>
              <li>
                Engine sidecars (MLXServe, GGUF/llama.cpp) for extra model
                backends
              </li>
              <li>Instant Sparkle updates, with opt-in beta builds</li>
            </ul>
          </article>

          <article className="dualCard">
            <p className="dualCardEyebrow">Why two editions</p>
            <h3>Same cat, different fences.</h3>
            <p className="dualCardBody">
              Mac App Store apps run inside the App Sandbox, which is great
              for many things and simply doesn’t permit others — privileged
              power management, controlling other apps, or bundling extra
              engine processes. Indoor Cat (App Store) ships everything the
              sandbox allows; Outdoor Cat ships everything else too. Both are
              free to download, and licenses cover both.
            </p>
            <ul className="dualCardList">
              <li>Indoor Cat: App Store convenience, sandboxed</li>
              <li>Outdoor Cat: direct download, notarized by Apple</li>
              <li>Your data stays on-device in both</li>
            </ul>
          </article>
        </div>

        <div className="dualCards" style={{ maxWidth: 720 }}>
          <article className="dualCard dualCardStrong">
            <p className="dualCardEyebrow">Download</p>
            <h3>{version ? `Latest: ${version}` : "Get Outdoor Cat"}</h3>
            <p className="dualCardBody">
              Signed and notarized. Updates arrive in-app via Sparkle.
            </p>
            {brewCmd ? (
              <pre className="commandBlock">
                <code>{brewCmd}</code>
              </pre>
            ) : null}
            <div className="dualCardActions">
              {downloadUrl ? (
                <a className="planButton" href={downloadUrl}>
                  Download .dmg
                </a>
              ) : null}
              <Link className="secondaryButton" href="/download">
                All install options
              </Link>
            </div>
          </article>

          <article className="dualCard">
            <p className="dualCardEyebrow">Docs</p>
            <h3>See every feature’s status.</h3>
            <p className="dualCardBody">
              The module ledger lists each feature, which edition ships it,
              and how it’s tested — generated straight from the codebase.
            </p>
            <div className="dualCardActions">
              <Link className="secondaryButton" href="/docs">
                Feature matrix
              </Link>
            </div>
          </article>
        </div>
      </ContentPage>
    </SiteShell>
  );
}
