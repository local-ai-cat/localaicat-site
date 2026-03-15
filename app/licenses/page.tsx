import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Open Source Licenses",
  description:
    "Open source package attributions used in Local AI Cat, including MLX, WhisperKit, and other Swift dependencies."
};

const packages = [
  "GzipSwift",
  "Jinja",
  "mlx-swift",
  "mlx-swift-examples",
  "NetworkImage",
  "SDWebImage",
  "SDWebImageSwiftUI",
  "swift-argument-parser",
  "swift-async-algorithms",
  "swift-cmark",
  "swift-collections",
  "swift-markdown-ui",
  "swift-numerics",
  "swift-transformers",
  "WhisperKit"
] as const;

export default function LicensesPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Local AI Cat depends on open source software. We appreciate the maintainers behind these projects and list the current package set here for attribution reference."
        kicker="Licenses"
        meta="Reference page"
        title="Open Source Licenses"
      >
        <section className="contentCard">
          <h2>Swift package dependencies</h2>
          <div className="licenseList">
            {packages.map((item) => (
              <div className="licenseItem" key={item}>
                <h3>{item}</h3>
                <p>Repository and license information available on the upstream project page.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="contentCard">
          <h2>Questions</h2>
          <p>
            For licensing or attribution questions, contact{" "}
            <a className="textLink" href="mailto:legal@localaicat.com">
              legal@localaicat.com
            </a>
            .
          </p>
        </section>
      </ContentPage>
    </SiteShell>
  );
}
