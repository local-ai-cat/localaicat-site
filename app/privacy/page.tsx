import { AnalyticsPreference } from "../_components/site-analytics";
import type { Metadata } from "next";
import Link from "next/link";
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
        meta="Last updated: October 2026"
        title="Privacy Policy"
        callout={
          <>
            <p>
              <strong>TL;DR:</strong> We do not collect, store, or transmit your
              conversations. Your data stays on your device unless you
              explicitly choose an optional Apple-provided service.
            </p>
            <p>
              Lire cette page en{" "}
              <Link className="textLink" href="/privacy/fr">
                français
              </Link>
              .
            </p>
          </>
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
            The direct-download and business path may introduce purchase,
            entitlement, or billing records needed to manage subscriptions,
            Developer Mode, Team access, or Enterprise rollout. Those records
            should be limited to commerce and entitlement state, not your chat
            content.
          </p>
        </section>

        <section className="contentCard">
          <h2>Open-source licenses</h2>
          <p>
            Local AI Cat uses open-source libraries. See the full list on our{" "}
            <Link className="textLink" href="/licenses">
              third-party licenses
            </Link>{" "}
            page.
          </p>
        </section>

        <section className="contentCard" id="website-analytics">
          <h2>This website</h2>
          <p>We use Vercel Web Analytics to understand page visits, download clicks,
            creator opens and successful cat-code copies. It uses no analytics cookies.
            Vercel derives a daily visitor identifier from the request and discards
            that identifier after 24 hours; aggregate reports are retained.</p>
          <p>Reports include pages, referring sites, country, device and browser type.
            We strip query strings and fragments from the page URLs we send and
            exclude account, checkout and private pages. We never send cat names,
            birthdays, cat codes, drawings or chat content as analytics events.</p>
          <p>The explorer sign shows estimated visitors since midnight UTC. It is not
            a live headcount. Do Not Track and Global Privacy Control are respected;
            you can also turn website statistics off below. Your preference and your
            custom cat are saved only in this browser.</p>
          <p>This applies to the website, not the native app. Read more about{" "}
            <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel’s analytics privacy</a>.</p>
          <p>We also count public page views with cookie-free GoatCounter, using a small
            image request rather than a third-party script. We send only the public page
            path, without query strings, page titles or referring URLs. Public totals are at{" "}
            <a href="https://localaicat.goatcounter.com">localaicat.goatcounter.com</a>.
            Vercel Speed Insights measures page performance with the same privacy preferences.</p>
          <p>Chat support loads Chatwoot in an isolated panel only when you select it.
            We do not load it on checkout, activation or account pages, or send it your
            checkout details or current page URL. Information you choose to send in chat
            is handled by Chatwoot.</p>
          <AnalyticsPreference />
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
