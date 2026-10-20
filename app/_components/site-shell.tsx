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
  /** Force brand icon/tagline to a specific mode on deterministic pages */
  siteMode?: "personal" | "business";
  /** Widen the content frame for dense data views (e.g. the modules grid) */
  wide?: boolean;
  /** The homepage has its world selector beside the hero, so the desktop header leaves it out. */
  showWorldSelector?: boolean;
};

const navLinks =
  [
    { href: "/space", label: "Explore" },
    { href: "/pricing", label: "Pricing" },
    { href: "/support", label: "FAQ" },
    { href: "/#download", label: "Download", cta: true }
  ] as const;

const footerGroups =
  [
    {
      title: "Product",
      links: [
        { href: "/space", label: "Explore" },
        { href: "/pricing", label: "Pricing" },
        { href: "/outdoor", label: "Outdoor Cat" },
        { href: "/download/app-store", label: "App Store" },
        { href: "/teams", label: "Teams" }
      ]
    },
    {
      title: "Help",
      links: [
        { href: "/support", label: "FAQ" },
        { href: "/contact", label: "Contact" },
        { href: "/manage", label: "Manage billing" }
      ]
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/licenses", label: "Licenses" }
      ]
    }
  ] as const;

export function SiteShell({
  children,
  siteMode,
  wide = false,
  showWorldSelector = true
}: SiteShellProps) {
  return (
    <>
      <SiteMode force={siteMode} />
      <ScrollHeader>
        <div className="siteHeaderInner">
          <Link className="brandMark" href="/">
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
            {navLinks.map((link) => (
              <Link
                className={"cta" in link && link.cta ? "navCta" : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* On phones the menu always carries the world switch, even on the homepage once its hero switch has scrolled away. */}
          <MobileNav links={navLinks} />
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
            <p className="footerText"><span className="footerTextSpace">Your own personal space.</span><span className="footerTextEarth">AI that stays at home.</span></p>
          </div>

          <nav aria-label="Footer" className="footerColumns">
            {footerGroups.map((group) => (
              <div className="footerColumn" key={group.title}>
                <p className="footerColumnTitle">{group.title}</p>
                <ul className="footerLinks">
                  {group.links.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="footerFine">© {new Date().getFullYear()} Local AI Cat. Made with care, and a cat.</p>
      </footer>
    </>
  );
}
