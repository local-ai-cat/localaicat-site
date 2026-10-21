import Image from "next/image";
import { MODES, SITE_CREW, type Mode } from "../../lib/site-personality";
import { PixelCat } from "./space-experience";

export function HeroCat({ mode }: { mode: Mode }) {
  return (
    <div className="heroCatPortrait" role="img" aria-label={SITE_CREW[mode].name}>
      {MODES.map(item => (
        <div key={item} className="heroCatLayer" data-active={mode === item} aria-hidden="true">
          {/* Eager, not preloaded: in Space these portraits are hidden and must not jump the voyage poster's queue;
              in Earth the browser raises them itself once it sees them on screen. */}
          {item === "space" ? <PixelCat decorative /> : <Image
            src={`/assets/cat-${item}.png`} alt="" width={280} height={280}
            sizes="(max-width: 650px) 200px, 260px" draggable={false} loading="eager" />}
        </div>
      ))}
    </div>
  );
}
