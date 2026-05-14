import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { ScreenshotTool } from "./screenshot-tool";

export const metadata: Metadata = {
  title: "Screenshot composer",
  description: "Internal tool for composing App Store screenshots.",
  robots: { index: false, follow: false }
};

export default function ScreenshotsPage() {
  return (
    <SiteShell>
      <section className="screenshotTool">
        <header className="screenshotToolHero">
          <p className="contentKicker">Internal</p>
          <h1 className="contentTitle">Screenshot composer</h1>
          <p className="contentIntro">
            Drop iPhone or Mac screenshots in. Frame them, add a headline,
            tweak the scale, then export at the exact size the App Store
            wants.
          </p>
        </header>
        <ScreenshotTool />
      </section>
    </SiteShell>
  );
}
