import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Window Management",
  description:
    "macOS window management in Local AI Cat. Available in the direct-download build."
};

export default function WindowManagementPage() {
  return (
    <SiteShell>
      <ContentPage
        intro="Keyboard shortcuts and side-by-side layouts for macOS. Requires the direct-download build."
        kicker="macOS Feature"
        title="Window management"
        callout={
          <p>
            The Mac App Store build can only move the Local AI Cat window
            itself. Controlling other apps&apos; windows requires the{" "}
            <Link className="textLink" href="/download/direct">
              direct build
            </Link>{" "}
            because App Store sandboxing blocks that access.
          </p>
        }
      >
        <section className="contentCard">
          <h2>What you get</h2>
          <ul>
            <li>Snap windows into side-by-side layouts with keyboard shortcuts</li>
            <li>Control other apps&apos; windows alongside Local AI Cat</li>
            <li>Full macOS system integration outside sandbox limits</li>
          </ul>
          <div className="routeActions">
            <Link className="planButton" href="/download/direct">
              Get the direct build
            </Link>
          </div>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
