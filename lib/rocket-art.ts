// The app's rocket (SpaceCadetPixelArt), for the site's React rockets. The canvas voyages draw the same art from
// public/space-demo/rocket-renderer.js; lib/rocket-art.test.ts fails if the two copies drift apart.

/** `#` hull, `u` fuel tank, `c` charging cable (only drawn while charging). */
export const rocketArt = [
  "................",
  ".....##.........",
  ".....##.........",
  "...##..##.......",
  "...##..##.......",
  "..#uuuuuu#......",
  "..#uuuuuu#......",
  "..#uuuuuu#cccc..",
  "..#uuuuuu#ccccc.",
  "..#uuuuuu#....c.",
  "..#uuuuuu#....c.",
  "###uuuuuu###..c.",
  "############..c.",
  "###......###..c.",
  "###......###..c.",
  "..............c.",
  "..............c.",
  "..............c.",
  "..............c.",
  "..............c."
] as const;

export interface RocketRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The app's medium-thrust flame: three frames of rectangles, each with its bright core pixel. */
export const rocketFlameFrames: readonly { readonly flame: readonly RocketRect[]; readonly core: RocketRect }[] = [
  { flame: [{ x: 4, y: 15, w: 4, h: 2 }, { x: 5, y: 17, w: 2, h: 1 }], core: { x: 5, y: 15, w: 1, h: 1 } },
  { flame: [{ x: 4, y: 15, w: 4, h: 1 }, { x: 4, y: 16, w: 3, h: 2 }], core: { x: 5, y: 15, w: 1, h: 1 } },
  { flame: [{ x: 4, y: 15, w: 4, h: 1 }, { x: 5, y: 16, w: 3, h: 2 }], core: { x: 6, y: 15, w: 1, h: 1 } }
];

/** The app's high-power look (purple tank, blue flame): the site's rockets are always about to take off. */
export const rocketColours = { hull: "#e9e3ff", tank: "#bf5af2", flame: "#279cff", core: "#99edff" } as const;
