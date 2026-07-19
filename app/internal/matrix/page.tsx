import styles from "../internal.module.css";
import { MatrixView } from "./matrix-view";

export const metadata = { title: "Feature Matrix · Internal" };

export default function MatrixPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <p className={styles.pageEyebrow}>Internal · Capability</p>
        <h1 className={styles.pageTitle}>
          What ships,
          <br />
          where.
        </h1>
        <p className={styles.pageIntro}>
          Every feature on two axes — its <b>lane</b> (how far it&rsquo;s cleared to ship) and its{" "}
          <b>presence</b> across the four channels (Alpha · Beta · Outdoor · Main), split per platform. A glowing dot
          means it ships; hollow means planned; faint means off.
        </p>
      </div>
      <MatrixView />
    </>
  );
}
