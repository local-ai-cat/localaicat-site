import pixels from "./cadet-pixels.json";

type Palette = keyof typeof pixels;

/**
 * The Space Cadet in its pixel helmet. No hooks and no "use client": the shared header and footer render it as plain
 * SVG on the server, so every page no longer ships the wardrobe and launch-pad code just to draw it.
 */
export function PixelCat({ palette = "classic", className = "", decorative = false }: {palette?: Palette; className?: string; decorative?: boolean}) {
  return <svg className={`pixelCat ${className}`} viewBox="0 0 16 16" shapeRendering="crispEdges" role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Space Cadet cat in a pixel astronaut helmet"}>
    {pixels[palette].flatMap((row,y) => row.map((ink,x) => ink ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ink}/> : null))}
  </svg>;
}
