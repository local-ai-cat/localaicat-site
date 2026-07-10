import type { Metadata } from "next";
import { ContentPage } from "../../_components/content-page";

export const metadata: Metadata = { title: "API Reference" };

export default function ApiReferencePage() {
  return (
    <ContentPage kicker="Documentation" title="API Reference" intro="Reference documentation for the headless Local API is coming soon.">
      <section className="contentCard"><h2>Coming soon</h2><p>Endpoints, authentication, request formats, and examples will be documented here.</p></section>
    </ContentPage>
  );
}
