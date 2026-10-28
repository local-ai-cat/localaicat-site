import Link from "next/link";
import styles from "./internal.module.css";

export const metadata = { title: "Internal · Local AI Cat" };

const CARDS = [
  {
    href: "/internal/matrix",
    eyebrow: "Capability",
    title: "Feature Matrix",
    body: "The live view of what ships where — lane, channel, and platform for every feature. Generated from FeatureCatalog.swift.",
  },
  {
    href: "/internal/architecture",
    eyebrow: "System",
    title: "Architecture",
    body: "How the pieces fit — the release ladder, feature-gating model, and subsystem diagrams.",
  },
];

export default function InternalHome() {
  return (
    <>
      <div className={styles.pageHead}>
        <p className={styles.pageEyebrow}>Local AI Cat · Internal</p>
        <h1 className={styles.pageTitle}>Internal.</h1>
        <p className={styles.pageIntro}>
          Private engineering docs — the live capability matrix and the system architecture, both generated from the
          app&rsquo;s source of truth. Not linked from the public site.
        </p>
      </div>
      <div className={styles.indexGrid}>
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className={styles.indexCard}>
            <span className={styles.indexEyebrow}>{c.eyebrow}</span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
            <span className={styles.indexArrow}>Open →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
