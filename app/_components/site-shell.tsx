import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { ScrollHeader } from "./scroll-header";
import { SiteMode } from "./site-mode";

type SiteShellProps = {
  children: ReactNode;
  navMode?: "default" | "legal";
  /** Force brand icon/tagline to a specific mode on deterministic pages */
  siteMode?: "personal" | "business";
};

const navLinks =
  [
    { href: "/pricing", label: "Pricing" },
    { href: "/manage", label: "Manage" },
    { href: "/support", label: "Support" },
    { href: "/download", label: "Download", cta: true }
  ] as const;

const legalLinks =
  [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/licenses", label: "Licenses" },
    { href: "/support", label: "Support" }
  ] as const;

export function SiteShell({
  children,
  navMode = "default",
  siteMode
}: SiteShellProps) {
  const links = navMode === "legal" ? legalLinks : navLinks;

  return (
    <>
      <SiteMode force={siteMode} />
      <ScrollHeader>
        <div className="siteHeaderInner">
          <Link className="brandMark" href="/">
            <span className="brandIcon">
              <Image
                alt="Local AI Cat personal mark"
                className="brandIconImage brandIconImagePersonal"
                src="/assets/cat-personal.png"
                fill
                sizes="42px"
              />
              <Image
                alt="Local AI Cat business mark"
                className="brandIconImage brandIconImageBusiness"
                src="/assets/cat-business.png"
                fill
                sizes="42px"
              />
            </span>
            <span className="brandText">
              <strong>Local AI Cat</strong>
              <span className="brandTaglines">
                <span className="brandTagline brandTaglinePersonal">keep your paws off my data</span>
                <span className="brandTagline brandTaglineBusiness">for very serious cat business</span>
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="siteNav siteNavDesktop">
            {links.map((link) => (
              <Link
                className={"cta" in link && link.cta ? "navCta" : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <MobileNav links={links} />
        </div>
      </ScrollHeader>

      <div className="pageFrame">
        <main>{children}</main>
      </div>

      <footer className="siteFooter">
        <div className="siteFooterInner">
          <div>
            <p className="footerTitle">Local AI Cat</p>
            <p className="footerText">AI that stays at home.</p>
          </div>

          <nav aria-label="Footer" className="footerLinks">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Support</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
