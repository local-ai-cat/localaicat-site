import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
  navMode?: "default" | "legal";
};

const navLinks =
  [
    { href: "/download", label: "Download" },
    { href: "/manage", label: "Manage" },
    { href: "/support", label: "Support" }
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
  navMode = "default"
}: SiteShellProps) {
  const links = navMode === "legal" ? legalLinks : navLinks;

  return (
    <>
      <header className="siteHeader">
        <div className="siteHeaderInner">
          <Link className="brandMark" href="/">
            <span className="brandIcon">
              <Image
                alt="Local AI Cat personal mark"
                className="brandIconImage brandIconImagePersonal"
                src="/assets/cat-personal.png"
                fill
                sizes="58px"
              />
              <Image
                alt="Local AI Cat business mark"
                className="brandIconImage brandIconImageBusiness"
                src="/assets/cat-business.png"
                fill
                sizes="58px"
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

          <nav aria-label="Primary" className="siteNav">
            {links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="pageFrame">
        <main>{children}</main>
      </div>

      <footer className="siteFooter">
        <div className="siteFooterInner">
          <div>
            <p className="footerTitle">Local AI Cat</p>
            <p className="footerText">Private AI for people. Serious local AI for teams.</p>
          </div>

          <nav aria-label="Footer" className="footerLinks">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/licenses">Licenses</Link>
            <Link href="/support">Support</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
