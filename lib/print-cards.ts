/**
 * Cards for the 384-dot thermal printer (48 mm paper, 203 dpi). Each file is
 * a 1-bit master at the printer's own width, so it prints at original size
 * with no scaling. Sources: the Space Cadet press (Codex, 2026-10-07), the
 * "cat awaits" Purrdain cards (pollen, 2026-09-29), the "can you find
 * purrdain?" QR card and the press's PURRDAIN editions (the garden's
 * media/thermal/build_purrdain_qr_card.py and build_space_cadet_purrdain.py,
 * 2026-10-26). The editions' QR is localaicat.com/p, redirected in
 * next.config.ts.
 */
export const PRINTER_DOTS = 384;
const DOTS_PER_MM = 8;

export type PrintGroup = "space-cadet" | "purrdain";

export const PRINT_GROUPS: readonly { id: PrintGroup; name: string; note: string }[] = [
  { id: "purrdain", name: "purrdain", note: "a year of pro, on us. every qr here opens the purrdain page with the code filled in." },
  { id: "space-cadet", name: "space cadet", note: "the originals: the qr opens localaicat.com." }
];

export type PrintCard = {
  slug: string;
  group: PrintGroup;
  name: string;
  note: string;
  /** The master sent to the printer, PRINTER_DOTS wide. */
  file: string;
  heightDots: number;
  /** A reading-orientation view, when the master prints sideways. */
  previewFile?: string;
};

export const PRINT_CARDS: readonly PrintCard[] = [
  {
    slug: "boarding-pass",
    group: "space-cadet",
    name: "boarding pass",
    note: "from your desk to the stars",
    file: "/print/boarding-pass-384.png",
    heightDots: 720
  },
  {
    slug: "orbit-postcard",
    group: "space-cadet",
    name: "postcard",
    note: "wish you were here",
    file: "/print/orbit-postcard-384.png",
    heightDots: 650
  },
  {
    slug: "mission-receipt",
    group: "space-cadet",
    name: "mission receipt",
    note: "curiosity unlimited, one cat",
    file: "/print/mission-receipt-384.png",
    heightDots: 704
  },
  {
    slug: "boarding-pass-vertical",
    group: "space-cadet",
    name: "boarding pass, tall",
    note: "the first draft: desk to orbit, top to bottom",
    file: "/print/boarding-pass-vertical-384.png",
    heightDots: 614
  },
  {
    slug: "boarding-pass-sideways",
    group: "space-cadet",
    name: "sideways boarding pass",
    note: "prints along the paper; shown here the way you read it",
    file: "/print/boarding-pass-horizontal-384.png",
    heightDots: 768,
    previewFile: "/print/boarding-pass-horizontal-landscape.png"
  },
  {
    slug: "purrdain-boarding-pass",
    group: "purrdain",
    name: "boarding pass, purrdain",
    note: "the boarding pass with the code",
    file: "/print/purrdain-boarding-pass-384.png",
    heightDots: 780
  },
  {
    slug: "purrdain-orbit-postcard",
    group: "purrdain",
    name: "postcard, purrdain",
    note: "wish you were here, with the code",
    file: "/print/purrdain-orbit-postcard-384.png",
    heightDots: 710
  },
  {
    slug: "purrdain-mission-receipt",
    group: "purrdain",
    name: "mission receipt, purrdain",
    note: "the receipt with the code",
    file: "/print/purrdain-mission-receipt-384.png",
    heightDots: 764
  },
  {
    slug: "purrdain-boarding-pass-vertical",
    group: "purrdain",
    name: "boarding pass, tall, purrdain",
    note: "desk to orbit, with the code",
    file: "/print/purrdain-boarding-pass-vertical-384.png",
    heightDots: 692
  },
  {
    slug: "purrdain-boarding-pass-sideways",
    group: "purrdain",
    name: "sideways boarding pass, purrdain",
    note: "the code rides in the CODE field",
    file: "/print/purrdain-boarding-pass-horizontal-384.png",
    heightDots: 768,
    previewFile: "/print/purrdain-boarding-pass-horizontal-landscape.png"
  },
  {
    slug: "purrdain-find",
    group: "purrdain",
    name: "can you find purrdain?",
    note: "the qr opens the purrdain page with the code filled in; counted as a card",
    file: "/print/purrdain-find-qr-384.png",
    heightDots: 732
  },
  {
    slug: "purrdain",
    group: "purrdain",
    name: "purrdain",
    note: "the cat awaits you, with the code",
    file: "/print/purrdain-solid-384.png",
    heightDots: 563
  },
  {
    slug: "purrdain-outline",
    group: "purrdain",
    name: "purrdain outline",
    note: "the cat awaits you, outline only",
    file: "/print/purrdain-outline-384.png",
    heightDots: 465
  },
  {
    slug: "cat-awaits",
    group: "purrdain",
    name: "the cat awaits",
    note: "the plain card: no code, no qr",
    file: "/print/cat-awaits-solid-384.png",
    heightDots: 465
  }
];

/** Printed length in whole millimetres. */
export function printedLengthMm(card: PrintCard): number {
  return Math.round(card.heightDots / DOTS_PER_MM);
}
