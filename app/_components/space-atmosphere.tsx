"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useSpaceMotion } from "./use-space-motion";
const STAR_COUNT = 38;
const stars = Array.from({ length: STAR_COUNT }, (_, index) => ({
  x: (index * 73 + 8) % 100,
  y: (index * index * 13 + 7) % 100,
  opacity: 0.13 + (index % 4) * 0.09,
  size: index % 11 === 0 ? 3 : 2,
}));

export function SpaceAtmosphere({ active = true }: { active?: boolean }) {
  const skyRef = useRef<HTMLDivElement>(null);
  const { enabled, reducedMotion } = useSpaceMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = skyRef.current;
    if (!element) return;
    let inView = false;
    const syncVisibility = (): void => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return <>
    <div className="spaceAtmosphere" ref={skyRef} aria-hidden="true" data-active={active} data-animate={active && enabled && visible && !reducedMotion}>
      {stars.map((star, index) => <span key={index} className="skyPixel" style={{
        "--star-index": index, left: `${star.x}%`, top: `${star.y}%`, opacity: star.opacity, width: star.size, height: star.size,
      } as CSSProperties} />)}
      {[0, 1, 2].map(index => <span key={index} className="shootingStar" style={{ "--shooting-index": index } as CSSProperties} />)}
    </div>

  </>;
}

export function SpaceMotionControl() {
  const { enabled, reducedMotion, toggleMotion } = useSpaceMotion();
  return (
    <button type="button" className="skyMotionControl" aria-label="Animate the space journey" aria-pressed={enabled && !reducedMotion}
      disabled={reducedMotion} title={reducedMotion ? "Motion is paused by your reduced motion preference" : "Moving stars and a planet-hopping cat"} onClick={toggleMotion}>
      <span aria-hidden="true">{enabled && !reducedMotion ? "✦" : "✧"}</span>
      {reducedMotion ? "Still sky" : `Motion ${enabled ? "on" : "off"}`}
    </button>
  );
}
