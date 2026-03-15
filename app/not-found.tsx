import Link from "next/link";
import { SiteShell } from "./_components/site-shell";

export default function NotFound() {
  return (
    <SiteShell navMode="legal">
      <section className="notFound">
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
