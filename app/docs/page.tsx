import Link from "next/link";
import { ContentPage } from "../_components/content-page";

export default function DocsPage() {
  return (
    <ContentPage
      kicker="Documentation"
      title="How Local AI Cat works"
      intro="Local AI Cat runs private AI features on your Apple devices and exposes clear seams for extending, connecting, and testing them."
    >
      <div className="contentGrid">
        <section className="contentCard">
          <h2>Local-first</h2>
          <p>Chats, transcription, and supported model workloads run on your device by default.</p>
        </section>
        <section className="contentCard">
          <h2>Modular features</h2>
          <p>Product capabilities are separated into focused modules with explicit platform and release availability.</p>
        </section>
        <section className="contentCard">
          <h2>Headless Local API</h2>
          <p>The macOS app can expose local model and transcription capabilities through an HTTP API.</p>
        </section>
      </div>
      <section className="contentCard">
        <h2>Explore the docs</h2>
        <p>
          Start with the <Link className="textLink" href="/docs/features">feature coverage</Link>,
          follow the <Link className="textLink" href="/docs/modularity">modular refactoring status</Link>,
          or browse the upcoming <Link className="textLink" href="/docs/api">API reference</Link> and{" "}
          <Link className="textLink" href="/docs/testing">testing evidence</Link>.
        </p>
      </section>
    </ContentPage>
  );
}
