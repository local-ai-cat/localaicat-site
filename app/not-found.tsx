import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "./_components/site-shell";
import { PixelCat } from "./_components/space-experience";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return (
    <SiteShell>
      <section className="notFound">
        <PixelCat decorative className="notFoundCat" />
        <p className="sectionEyebrow">404</p>
        <h1>This cat wandered off.</h1>
        <p>
          The page you were looking for is not here, but the main site and
          support pages still are.
        </p>
        <div className="heroActions">
          <Link className="primaryButton" href="/">
            Go home
          </Link>
          <Link className="secondaryButton" href="/support">
            Open support
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
