import rig from "../public/space-demo/cadet-rig.json" with {type: "json"};

export const cadetRig = rig;
export type ArtFrame = {x: number; y: number; width: number; height: number};

// Legacy plain cats occupy the body frame. Composites and high-density masters
// occupy the full artboard; source resolution never determines display size.
export function portraitFrame(sourceSize: number): ArtFrame {
  if (!Number.isInteger(sourceSize) || sourceSize < 1) throw new Error("Invalid artwork size.");
  if (sourceSize === 16) return {...rig.body};
  return {x: 0, y: 0, ...rig.artboard};
}
