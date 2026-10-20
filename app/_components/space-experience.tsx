"use client";

import { useEffect, useState } from "react";
import pixels from "./cadet-pixels.json";
import { CatPortrait } from "./cat-builder";
import { CliInstall, DownloadPair } from "./home-downloads";
import { loadCatRuntime, readSavedCat } from "../../lib/cadet-runtime";
import type { CatDesign } from "../../lib/cadet-runtime";
import { rocketArt, rocketColours, rocketFlameFrames } from "../../lib/rocket-art";
import type { MouseEvent } from "react";

type Palette = keyof typeof pixels;
const LAUNCH_STAR_COUNT = 44;
const LIFTOFF_MS = 2600;

export function PixelCat({ palette = "classic", className = "", decorative = false }: {palette?: Palette; className?: string; decorative?: boolean}) {
  return <svg className={`pixelCat ${className}`} viewBox="0 0 16 16" shapeRendering="crispEdges" role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Space Cadet cat in a pixel astronaut helmet"}>
    {pixels[palette].flatMap((row,y) => row.map((ink,x) => ink ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={ink}/> : null))}
  </svg>;
}

/** The app's rocket, with its tank in lilac and the medium-thrust flame cycling underneath. */
export function PixelShip({className = ""}: {className?: string}) {
  return <svg className={className} viewBox="0 1 12 17" shapeRendering="crispEdges" aria-hidden="true">
    {rocketArt.flatMap((row, y) => [...row].map((role, x) => {
      if (role !== "#" && role !== "u") return null;
      return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={role === "#" ? rocketColours.hull : rocketColours.tank}/>;
    }))}
    <g className="shipFlame">{rocketFlameFrames.map((frame, index) => <g key={index} className="shipFlameFrame">
      {frame.flame.map(rect => <rect key={`${rect.x}-${rect.y}`} {...{x: rect.x, y: rect.y, width: rect.w, height: rect.h}} fill={rocketColours.flame}/>)}
      <rect x={frame.core.x} y={frame.core.y} width={frame.core.w} height={frame.core.h} fill={rocketColours.core}/>
    </g>)}</g>
  </svg>;
}

/** The visitor's own cat from the wardrobe, or null until they make one. */
function useSavedCat(): CatDesign | null {
  const [cat, setCat] = useState<CatDesign | null>(null);
  useEffect(() => {
    let disposed = false;
    loadCatRuntime().then(api => { if (!disposed) setCat(readSavedCat(api)); }).catch(() => {});
    function receive(event: Event): void { setCat((event as CustomEvent<CatDesign>).detail); }
    window.addEventListener("space-cadet-saved", receive);
    return () => { disposed = true; window.removeEventListener("space-cadet-saved", receive); };
  }, []);
  return cat;
}

/** Closing call to action: the visitor's cat waits on the pad and lifts off on download. */
export function SpaceLaunchPad() {
  const cat = useSavedCat();
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    if (!launched) return;
    const timer = window.setTimeout(() => setLaunched(false), LIFTOFF_MS);
    return () => window.clearTimeout(timer);
  }, [launched]);

  function launchOnDownload(event: MouseEvent<HTMLElement>): void {
    if (event.target instanceof Element && event.target.closest(".heroDownloads a")) setLaunched(true);
  }

  const name = cat?.appearance.name;
  return <section className="spaceLaunchPad" aria-labelledby="space-launch-title" data-launched={launched} onClickCapture={launchOnDownload}>
    <div className="launchScene" aria-hidden="true">
      <div className="launchStars">{Array.from({length: LAUNCH_STAR_COUNT}, (_, i) => <span className="launchStar" key={i} style={{left: `${(i * 37 + 11) % 100}%`, top: `${(i * i * 13 + 5) % 82}%`, opacity: 0.2 + (i % 4) * 0.18}}/>)}</div>
      <div className="launchCraft">
        <span className="launchCat">{cat?.pixels ? <CatPortrait pixels={cat.pixels} name={cat.appearance.name}/> : <PixelCat decorative/>}</span>
        <PixelShip className="launchShip"/>
      </div>
      <div className="launchGantry"><i/><i/><i/></div>
    </div>
    <h2 id="space-launch-title">{name ? `${name} is ready for liftoff.` : "Ready for liftoff?"}</h2>
    <p className="launchLead">Free to start. Your chats, voice and cat stay on your device.</p>
    <DownloadPair />
    <p className="launchMeta">Apple silicon Macs · iPhone · iPad</p>
    <p className="launchStatus" role="status">{launched ? "See you up there." : ""}</p>
    <CliInstall />
  </section>;
}
