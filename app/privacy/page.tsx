import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Local AI Cat keeps your chats, models, and voice inputs on your device. Read our privacy policy to learn what we do and do not collect."
};

export default function PrivacyPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Local AI Cat is designed around on-device AI. The default experience keeps your chats, models, and voice inputs on your own hardware instead of routing them through our servers."
        kicker="Privacy"
        meta="Last updated: March 2026"
        title="Privacy Policy"
        callout={
          <p>
            <strong>TL;DR:</strong> We do not collect, store, or transmit your
            conversations. Your data stays on your device unless you explicitly
            choose an optional Apple-provided service.
          </p>
        }
      >
        <section className="contentCard">
          <h2>What we do not collect</h2>
          <ul>
            <li>Chat content or conversations</li>
            <li>Voice recordings or transcriptions</li>
            <li>Personal information for core app use</li>
            <li>Tracking analytics tied to your prompts</li>
          </ul>
        </section>

        <div className="contentGrid">
          <section className="contentCard">
            <h2>Local storage by default</h2>
            <p>
              The app is built around local model execution and local storage.
              If you delete the app, the local data stored by that install is
              removed from that device.
            </p>
          </section>

          <section className="contentCard">
            <h2>Optional Apple-managed services</h2>
            <p>
              If you enable an Apple-provided enhancement such as cloud-backed
              transcription, that processing is governed by Apple&apos;s terms and
              privacy policies. Local AI Cat does not receive or store that
              audio.
            </p>
          </section>
        </div>

        <section className="contentCard">
          <h2>Direct download and billing</h2>
          <p>
            The direct-download and business path may introduce Paddle purchase,
            entitlement, or billing records needed to manage subscriptions,
            Developer Mode, Team access, or Enterprise rollout. Those records
            should be limited to commerce and entitlement state, not your chat
            content.
          </p>
        </section>

        <section className="contentCard">
          <h2>Questions</h2>
          <p>
            For privacy questions, contact{" "}
            <a className="textLink" href="mailto:privacy@localaicat.com">
              privacy@localaicat.com
            </a>
            .
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
