import type { Metadata } from "next";
import { ContentPage } from "../_components/content-page";
import { SiteShell } from "../_components/site-shell";
import {
  PRINT_CARDS,
  PRINT_GROUPS,
  PRINTER_DOTS,
  printedLengthMm,
  type PrintCard
} from "../../lib/print-cards";
import styles from "./print.module.css";

export const metadata: Metadata = {
  title: "The little paper press",
  description: "Cards for a 48 mm thermal printer.",
  // A drawer for our own printer, not for search; it is not in the sitemap either.
  robots: { index: false, follow: false }
};

function CardPreview({ card }: { card: PrintCard }) {
  const sideways = Boolean(card.previewFile);
  const previewWidth = sideways ? card.heightDots : PRINTER_DOTS;
  const previewHeight = sideways ? PRINTER_DOTS : card.heightDots;

  return (
    <article className={styles.card} id={card.slug}>
      <div className={sideways ? `${styles.paper} ${styles.paperWide}` : styles.paper}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the exact 1-bit bytes, never re-encoded */}
        <img
          alt={`${card.name} card`}
          height={previewHeight}
          src={card.previewFile ?? card.file}
          width={previewWidth}
        />
      </div>
      <p className={styles.cardName}>{card.name}</p>
      <p className={styles.cardNote}>{card.note}</p>
      <p className={styles.cardMeta}>
        {PRINTER_DOTS} dots wide · {printedLengthMm(card)} mm long
      </p>
      <a className="secondaryButton" download href={card.file}>
        save for the printer
      </a>
    </article>
  );
}

export default function PrintPage() {
  return (
    <SiteShell siteMode="personal">
      <ContentPage
        kicker="print"
        title="the little paper press"
        intro="cards for a 48 mm thermal printer. every file is already the printer's width, 384 dots, so it prints dot for dot."
      >
        <ol className={styles.howTo}>
          <li>tap save under a card (on a phone, the image opens; press and hold it to save).</li>
          <li>open it in the printer&apos;s app (iPrint).</li>
          <li>print at original size: no fit to page, no scaling. print one sample before a batch.</li>
        </ol>
        {PRINT_GROUPS.map((group) => (
          <section className={styles.group} id={group.id} key={group.id}>
            <h2 className={styles.groupName}>{group.name}</h2>
            <p className={styles.groupNote}>{group.note}</p>
            <div className={styles.grid}>
              {PRINT_CARDS.filter((card) => card.group === group.id).map((card) => (
                <CardPreview card={card} key={card.slug} />
              ))}
            </div>
          </section>
        ))}
      </ContentPage>
    </SiteShell>
  );
}
