import test from "node:test";
import assert from "node:assert/strict";
import "../public/space-demo/rocket-renderer.js";
import { rocketArt, rocketColours, rocketFlameFrames } from "./rocket-art.ts";

interface RendererPixel { x: number; y: number; w: number; h: number; colour: string; role: string }
interface Renderer {
  art: string[];
  colours: Record<string, string>;
  frame(input: object, time: number): { pixels: RendererPixel[] };
}
const renderer = (globalThis as unknown as { SpaceRocket: Renderer }).SpaceRocket;

test("the site's React rocket is the same art as the canvas voyages and the app", () => {
  assert.deepEqual([...rocketArt], renderer.art);
});

test("its flame frames and colours match the renderer's medium-thrust flame", () => {
  // cpuFraction 0.5 is medium thrust; its frame interval is about 0.26 s, so these times land on frames 0, 1 and 2.
  rocketFlameFrames.forEach((expected, index) => {
    const pixels = renderer.frame({ cpuFraction: 0.5 }, index * 0.3).pixels;
    const flame = pixels.filter(pixel => pixel.role === "flame").map(({ x, y, w, h }) => ({ x, y, w, h }));
    const core = pixels.find(pixel => pixel.role === "core")!;
    assert.deepEqual(flame, expected.flame, `frame ${index}`);
    assert.deepEqual({ x: core.x, y: core.y, w: core.w, h: core.h }, expected.core, `core ${index}`);
  });
  assert.equal(rocketColours.hull, renderer.colours.neutral);
  assert.equal(rocketColours.flame, renderer.colours.flame);
  assert.equal(rocketColours.core, renderer.colours.core);
});
