import { readFile } from "node:fs/promises";
import path from "node:path";
import styles from "../internal.module.css";
import { MatrixView, type Feature } from "./matrix-view";

export const metadata = { title: "Feature Matrix · Internal" };
export const dynamic = "force-dynamic";

// The internal manifest is not in git (this repo is public); it is read at request time from a
// local or CLI-deployed copy and passed to the client view, so it never enters a public bundle.
const MANIFEST_PATH = path.join(process.cwd(), "app/internal/data/features.json");

async function readManifest(): Promise<Feature[] | null> {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as { features?: Feature[] };
    return manifest.features ?? null;
  } catch {
    return null;
  }
}

export default async function MatrixPage() {
  const features = await readManifest();
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
      {features ? (
        <MatrixView features={features} />
      ) : (
        <p className={styles.pageIntro}>The feature manifest is not on this deployment.</p>
      )}
    </>
  );
}
