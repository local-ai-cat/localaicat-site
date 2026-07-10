import type { Metadata } from "next";
import { ContentPage } from "../../_components/content-page";

export const metadata: Metadata = { title: "Testing Evidence" };

export default function TestingEvidencePage() {
  return (
    <ContentPage kicker="Documentation" title="Testing Evidence" intro="Public testing evidence for Local AI Cat features is coming soon.">
      <section className="contentCard"><h2>Coming soon</h2><p>Supported scenarios and their verification status will be collected here.</p></section>
    </ContentPage>
  );
}
