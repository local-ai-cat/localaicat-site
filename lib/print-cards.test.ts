import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PRINT_CARDS, PRINT_GROUPS, PRINTER_DOTS, printedLengthMm } from "./print-cards.ts";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(publicPath: string): { width: number; height: number } {
  const bytes = readFileSync(new URL(`../public${publicPath}`, import.meta.url));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("every master is the printer's width and the height the page states", () => {
  for (const card of PRINT_CARDS) {
    assert.deepEqual(pngSize(card.file), { width: PRINTER_DOTS, height: card.heightDots }, card.slug);
  }
});

test("a sideways card's preview is the master turned a quarter", () => {
  for (const card of PRINT_CARDS.filter((entry) => entry.previewFile)) {
    assert.deepEqual(pngSize(card.previewFile!), { width: card.heightDots, height: PRINTER_DOTS }, card.slug);
  }
});

test("slugs are unique and lengths are in millimetres", () => {
  assert.equal(new Set(PRINT_CARDS.map((card) => card.slug)).size, PRINT_CARDS.length);
  assert.equal(printedLengthMm(PRINT_CARDS[0]), 90);
});

test("every card sits in a group the page shows", () => {
  const groups = new Set(PRINT_GROUPS.map((group) => group.id));
  for (const card of PRINT_CARDS) {
    assert.ok(groups.has(card.group), card.slug);
  }
});

test("the purrdain editions' short qr address is redirected to the claim page", () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /source: "\/p", destination: "\/purrdain\?src=card", permanent: false/);
});
