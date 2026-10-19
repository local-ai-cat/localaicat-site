import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { ScrollHeader } from "./scroll-header";
import { ModeSelector, SiteMode } from "./site-mode";

import { PixelCat } from "./space-experience";
import { ExplorerCount } from "./explorer-presence";

type SiteShellProps = {
  children: ReactNode;
  navMode?: "default" | "legal";
  /** Force brand icon/tagline to a specific mode on deterministic pages */
  siteMode?: "personal" | "business";
  /** Widen the content frame for dense data views (e.g. the modules grid) */
  wide?: boolean;
  /** The homepage has its world selector beside the hero. */
  showWorldSelector?: boolean;
};

const navLinks =
  [
    { href: "/pricing", label: "Pricing" },
    { href: "/support", label: "FAQ" },
    { href: "/#download", label: "Download", cta: true }
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
  siteMode,
  wide = false,
  showWorldSelector = true
}: SiteShellProps) {
  const links = navMode === "legal" ? legalLinks : navLinks;

  return (
    <>
      <SiteMode force={siteMode} />
      <ScrollHeader>
        <div className="siteHeaderInner">
          <Link className="brandMark" href="/" aria-label="Local AI Cat home">
            <span className="brandIcon">
              <PixelCat decorative className="brandIconImageSpace"/>
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
              <span className="brandTaglines"><span className="brandTagline brandTaglineSpace">a little universe, all yours</span>
                <span className="brandTagline brandTaglinePersonal">keep your paws off my data</span>
                <span className="brandTagline brandTaglineBusiness">for very serious cat business</span>
              </span>
            </span>
          </Link>

          <div className="headerPersonality">{showWorldSelector && <ModeSelector compact />}</div>
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

          <MobileNav links={links} showWorldSelector={showWorldSelector} />
        </div>
      </ScrollHeader>

      <div className="explorerSign"><ExplorerCount /></div>
      <div className={wide ? "pageFrame pageFrameWide" : "pageFrame"}>
        <main>{children}</main>
      </div>

      <footer className="siteFooter">
        <div className="siteFooterInner">
          <div>
            <p className="footerTitle"><span className="footerCadet"><PixelCat decorative/></span>Local AI Cat</p>
            <p className="footerText">AI that stays at home.</p>
          </div>

          <nav aria-label="Footer" className="footerLinks">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/manage">Manage</Link>
            <Link href="/support">Support</Link>
            <Link href="/space?mode=space">Explore the app designs</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
