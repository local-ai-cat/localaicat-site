import type { Metadata } from "next";
import Link from "next/link";
import featureData from "../../../data/public-features.json";
import { ContentPage } from "../../_components/content-page";
import type { PublicFeature } from "../features/feature-list";

export const metadata: Metadata = { title: "Modular Refactoring" };

type Grade = "gold" | "strong" | "partial" | "weak";

const gradeOrder: Grade[] = ["gold", "strong", "partial", "weak"];
const gradeMeta: Record<Grade, { label: string; description: string }> = {
  gold: {
    label: "Gold",
    description: "The engine is fully packaged and platform-pure; the app shell only hosts thin adapters for platform side effects."
  },
  strong: {
    label: "Strong",
    description: "The core logic is packaged and tested; the app shell still owns a small, named set of impure edges."
  },
  partial: {
    label: "Partial",
    description: "Meaningful pieces are packaged, but significant logic or UI still lives in the app shell."
  },
  weak: {
    label: "Weak",
    description: "The feature is mostly app-shell code; extraction has not started in earnest."
  }
};
const modularMeta = {
  yes: { label: "Fully packaged", className: "modSegYes" },
  partial: { label: "Partially packaged", className: "modSegPartial" },
  no: { label: "In the app shell", className: "modSegNo" }
} as const;

function SegmentedBar({ segments, label }: {
  label: string;
  segments: { key: string; label: string; count: number; className: string }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const visible = segments.filter((segment) => segment.count > 0);
  return (
    <figure className="modBarFigure">
      <figcaption className="modBarLabel">{label}</figcaption>
      <div aria-hidden="true" className="modBar">
        {visible.map((segment) => (
          <span
            className={`modSeg ${segment.className}`}
            key={segment.key}
            style={{ flexGrow: segment.count }}
            title={`${segment.label}: ${segment.count} of ${total}`}
          />
        ))}
      </div>
      <ul className="modLegend">
        {visible.map((segment) => (
          <li key={segment.key}>
            <span aria-hidden="true" className={`modSwatch ${segment.className}`} />
            {segment.label} <strong>{segment.count}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export default function ModularityPage() {
  const features = featureData.features as PublicFeature[];
  const graded = features.filter((feature) => feature.goldStandard !== null);
  const byGrade = (grade: Grade) => graded.filter((feature) => feature.goldStandard?.grade === grade);
  const byModular = (value: PublicFeature["modular"]) => features.filter((feature) => feature.modular === value);

  const fullyPackaged = byModular("yes").length;
  const goldOrStrong = byGrade("gold").length + byGrade("strong").length;

  return (
    <ContentPage
      kicker="Documentation"
      title="Modular Refactoring"
      intro="Local AI Cat is being refactored feature by feature into focused Swift packages: a pure, tested engine per feature, with the app shell reduced to thin platform adapters. This page tracks how far along each public feature is."
      meta={`Snapshot updated ${featureData.updated}`}
    >
      <div className="modStats">
        <div className="modStat">
          <span className="modStatValue">{features.length}</span>
          <span className="modStatLabel">Public features</span>
        </div>
        <div className="modStat">
          <span className="modStatValue">{fullyPackaged}</span>
          <span className="modStatLabel">Fully packaged</span>
        </div>
        <div className="modStat">
          <span className="modStatValue">{goldOrStrong}</span>
          <span className="modStatLabel">Gold or Strong alignment</span>
        </div>
      </div>

      <SegmentedBar
        label="Package extraction"
        segments={(Object.keys(modularMeta) as (keyof typeof modularMeta)[]).map((key) => ({
          key,
          label: modularMeta[key].label,
          count: byModular(key).length,
          className: modularMeta[key].className
        }))}
      />
      <SegmentedBar
        label="Gold-standard alignment"
        segments={gradeOrder.map((grade) => ({
          key: grade,
          label: gradeMeta[grade].label,
          count: byGrade(grade).length,
          className: `gradeSeg_${grade}`
        }))}
      />

      <section className="contentCard">
        <h2>What the grades mean</h2>
        <p>
          The gold standard: the feature&apos;s engine lives entirely in its own package, the app
          never names the concrete type, build inclusion is package composition rather than
          compile-time flags, and the app shell contributes nothing beyond thin platform
          side-effect adapters.
        </p>
        <dl className="modGradeGlossary">
          {gradeOrder.map((grade) => (
            <div key={grade}>
              <dt>
                <span aria-hidden="true" className={`modSwatch gradeSeg_${grade}`} />
                {gradeMeta[grade].label}
              </dt>
              <dd>{gradeMeta[grade].description}</dd>
            </div>
          ))}
        </dl>
      </section>

      {gradeOrder.map((grade) => {
        const groupFeatures = byGrade(grade);
        if (groupFeatures.length === 0) return null;
        return (
          <section className="modGradeGroup" key={grade}>
            <h2 className="modGradeHeading">
              <span aria-hidden="true" className={`modSwatch gradeSeg_${grade}`} />
              {gradeMeta[grade].label}
              <span className="modGradeCount">{groupFeatures.length}</span>
            </h2>
            <div className="modFeatureList">
              {groupFeatures.map((feature) => (
                <article className="modFeature" key={feature.id}>
                  <h3>{feature.name}</h3>
                  {feature.package && <p className="fcPackage">{feature.package}</p>}
                  {feature.goldStandard?.gap && (
                    <p className="modGap">
                      <strong>Remaining:</strong> {feature.goldStandard.gap}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <p className="fcCrossLink">
        For what each feature does and where it ships, see the{" "}
        <Link className="textLink" href="/docs/features">feature coverage</Link>.
      </p>
    </ContentPage>
  );
}
