import styles from "../internal.module.css";

export const metadata = { title: "Architecture · Internal" };

export default function ArchitecturePage() {
  return (
    <>
      <div className={styles.pageHead}>
        <p className={styles.pageEyebrow}>Internal · System</p>
        <h1 className={styles.pageTitle}>Architecture.</h1>
        <p className={styles.pageIntro}>
          The release ladder, the feature-gating model, and subsystem diagrams — rendered with Mermaid. Coming next.
        </p>
      </div>
    </>
  );
}
