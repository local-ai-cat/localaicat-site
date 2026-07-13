import type { Metadata } from "next";
import Link from "next/link";
import featureData from "../../../data/public-features.json";
import { ContentPage } from "../../_components/content-page";
import { FeatureList, type PublicFeature } from "./feature-list";

export const metadata: Metadata = { title: "Feature Coverage" };

export default function FeatureCoveragePage() {
  const features = featureData.features as PublicFeature[];
  return (
    <ContentPage
      kicker="Documentation"
      title="Feature Coverage"
      intro="Every public Local AI Cat feature, with its platform, release-channel, and permission coverage. Expand a feature for its full availability grid and architecture notes."
      meta={`Snapshot updated ${featureData.updated}`}
    >
      <p className="fcCrossLink">
        Looking for how far each feature has been extracted into its own module? See the{" "}
        <Link className="textLink" href="/docs/modularity">modular refactoring status</Link>.
      </p>
      <FeatureList features={features} />
    </ContentPage>
  );
}
