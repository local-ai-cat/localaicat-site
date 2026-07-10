import type { Metadata } from "next";
import featureData from "../../../data/public-features.json";
import { ContentPage } from "../../_components/content-page";

export const metadata: Metadata = { title: "Feature Coverage" };

export default function FeatureCoveragePage() {
  return (
    <ContentPage
      kicker="Documentation"
      title="Feature Coverage"
      intro="Platform, release-tier, and permission coverage for public Local AI Cat features. Availability may vary within a platform."
      meta={`Snapshot updated ${featureData.updated}`}
    >
      <div className="featureCoverageList">
        {featureData.features.map((feature) => (
          <article className="featureCoverageRow" key={feature.name}>
            <h2>{feature.name}</h2>
            <dl className="featureCoverageMeta">
              <div><dt>Platforms</dt><dd>{feature.platforms.join(", ") || "Not available"}</dd></div>
              <div><dt>Tiers</dt><dd>{feature.tiers.join(", ") || "Not released"}</dd></div>
              <div><dt>Permissions</dt><dd>{feature.permissions.join(", ")}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </ContentPage>
  );
}
