import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./internal.module.css";

const NAV = [
  { href: "/internal/matrix", label: "Feature Matrix" },
  { href: "/internal/architecture", label: "Architecture" },
];

export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      {/* The public support-chat cookie banner is irrelevant on the private internal area. */}
      <style>{`#cookie-consent-banner{display:none!important}`}</style>
      <div className={styles.glow} aria-hidden />
      <header className={styles.bar}>
        <Link href="/internal" className={styles.brand}>
          <span className={styles.brandName}>Local AI Cat</span>
          <span className={styles.brandMark}>Internal</span>
        </Link>
        <nav className={styles.nav}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={styles.navLink}>
              {n.label}
            </Link>
          ))}
          <a className={styles.exit} href="/">
            ↗ Public site
          </a>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.foot}>
        Private · unreleased & parked features · generated from <code>FeatureCatalog.swift</code>
      </footer>
    </div>
  );
}
