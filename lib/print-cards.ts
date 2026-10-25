/**
 * Cards for the 384-dot thermal printer (48 mm paper, 203 dpi). Each file is
 * a 1-bit master at the printer's own width, so it prints at original size
 * with no scaling. Sources: the Space Cadet press (Codex, 2026-10-07), the
 * "cat awaits" Purrdain cards (pollen, 2026-09-29) and the "can you find
 * purrdain?" QR card (media/thermal/build_purrdain_qr_card.py, 2026-10-26).
 */
export const PRINTER_DOTS = 384;
const DOTS_PER_MM = 8;

export type PrintCard = {
  slug: string;
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
    name: "boarding pass",
    note: "from your desk to the stars",
    file: "/print/boarding-pass-384.png",
    heightDots: 720
  },
  {
    slug: "orbit-postcard",
    name: "postcard",
    note: "wish you were here",
    file: "/print/orbit-postcard-384.png",
    heightDots: 650
  },
  {
    slug: "mission-receipt",
    name: "mission receipt",
    note: "curiosity unlimited, one cat",
    file: "/print/mission-receipt-384.png",
    heightDots: 704
  },
  {
    slug: "boarding-pass-vertical",
    name: "boarding pass, tall",
    note: "the first draft: desk to orbit, top to bottom",
    file: "/print/boarding-pass-vertical-384.png",
    heightDots: 614
  },
  {
    slug: "boarding-pass-sideways",
    name: "sideways boarding pass",
    note: "prints along the paper; shown here the way you read it",
    file: "/print/boarding-pass-horizontal-384.png",
    heightDots: 768,
    previewFile: "/print/boarding-pass-horizontal-landscape.png"
  },
  {
    slug: "purrdain-find",
    name: "can you find purrdain?",
    note: "the qr opens the purrdain page with the code filled in; counted as a card",
    file: "/print/purrdain-find-qr-384.png",
    heightDots: 732
  },
  {
    slug: "purrdain",
    name: "purrdain",
    note: "the cat awaits you, with the code",
    file: "/print/purrdain-solid-384.png",
    heightDots: 563
  },
  {
    slug: "purrdain-outline",
    name: "purrdain outline",
    note: "the cat awaits you, outline only",
    file: "/print/purrdain-outline-384.png",
    heightDots: 465
  },
  {
    slug: "cat-awaits",
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
