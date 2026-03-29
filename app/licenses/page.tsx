import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: "Open Source Licenses",
  description:
    "Open source package attributions used in Local AI Cat, mirroring the app's current Swift package graph."
};

const packages = [
  {
    name: "MenuBarExtraAccess",
    repo: "https://github.com/orchetect/MenuBarExtraAccess"
  },
  {
    name: "mlx-swift",
    repo: "https://github.com/ml-explore/mlx-swift"
  },
  {
    name: "mlx-swift-lm",
    repo: "https://github.com/ml-explore/mlx-swift-lm"
  },
  {
    name: "NetworkImage",
    repo: "https://github.com/gonzalezreal/NetworkImage"
  },
  {
    name: "SDWebImage",
    repo: "https://github.com/SDWebImage/SDWebImage.git"
  },
  {
    name: "SDWebImageSwiftUI",
    repo: "https://github.com/SDWebImage/SDWebImageSwiftUI.git"
  },
  {
    name: "Sparkle",
    repo: "https://github.com/sparkle-project/Sparkle"
  },
  {
    name: "swift-argument-parser",
    repo: "https://github.com/apple/swift-argument-parser.git"
  },
  {
    name: "swift-asn1",
    repo: "https://github.com/apple/swift-asn1.git"
  },
  {
    name: "swift-async-algorithms",
    repo: "https://github.com/apple/swift-async-algorithms.git"
  },
  {
    name: "swift-cmark",
    repo: "https://github.com/swiftlang/swift-cmark"
  },
  {
    name: "swift-collections",
    repo: "https://github.com/apple/swift-collections.git"
  },
  {
    name: "swift-crypto",
    repo: "https://github.com/apple/swift-crypto.git"
  },
  {
    name: "Jinja (swift-jinja)",
    repo: "https://github.com/huggingface/swift-jinja.git"
  },
  {
    name: "swift-markdown-ui",
    repo: "https://github.com/gonzalezreal/swift-markdown-ui"
  },
  {
    name: "swift-numerics",
    repo: "https://github.com/apple/swift-numerics"
  },
  {
    name: "swift-transformers",
    repo: "https://github.com/huggingface/swift-transformers.git"
  },
  {
    name: "WhisperKit",
    repo: "https://github.com/argmaxinc/WhisperKit"
  },
  {
    name: "yyjson",
    repo: "https://github.com/ibireme/yyjson.git"
  }
] as const;

export default function LicensesPage() {
  return (
    <SiteShell navMode="legal">
      <ContentPage
        intro="Local AI Cat depends on open source software. This page mirrors the current Swift package graph used by the app so attribution is easy to inspect without digging through the project file."
        kicker="Licenses"
        meta="Reference page"
        title="Open Source Licenses"
      >
        <section className="contentCard">
          <h2>Swift package dependencies</h2>
          <div className="licenseList">
            {packages.map((item) => (
              <div className="licenseItem" key={item.name}>
                <h3>{item.name}</h3>
                <p>
                  Upstream repository:{" "}
                  <a className="textLink" href={item.repo}>
                    {item.repo}
                  </a>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="contentCard">
          <h2>Notes</h2>
          <p>
            License texts, notices, and any additional attribution requirements
            remain with the upstream projects listed above. If the shipped
            package set changes in the app, this page should change with it.
          </p>
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
