"use client";

import { SpaceMotionControl } from "./space-atmosphere";
import { CatPortrait } from "./cat-builder";
import { getDirectDownloadUrl } from "../../lib/env";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpaceMotion } from "./use-space-motion";
import { useCatStudio } from "./use-cat-studio";
import { trackSiteAction } from "../../lib/site-analytics";

type RocketPixel = { x: number; y: number; w: number; h: number; colour: string };
type Instruments = { fuel: number; colour: string; pixels: RocketPixel[] };
const powerNames = ["Low", "Medium", "High"];
const throttleStorageKey = "space-voyage-throttle";

export function HomeVoyage({ active = true }: { active?: boolean }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [caption, setCaption] = useState("A little expedition, already underway.");
  const { runtime, cat, openBuilder, builderOpen, studioUI } = useCatStudio();
  const [throttle, setThrottle] = useState(1);
  const [instruments, setInstruments] = useState<Instruments | null>(null);
  const { enabled, reducedMotion } = useSpaceMotion();
  const running = active && enabled && visible && !reducedMotion && !builderOpen;
  const portrait = useMemo(() => runtime?.model.serializeDesign(cat ?? runtime.model.normalizeDesign(null)), [runtime, cat]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(throttleStorageKey);
      if (saved !== null && /^[0-2]$/.test(saved)) setThrottle(Number(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!active || builderOpen) setSettingsOpen(false);
  }, [active, builderOpen]);

  // A cached scene can finish loading before hydration attaches onLoad.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc && doc.readyState === "complete" && doc.URL !== "about:blank") setReady(true);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function dismissOutside(event: PointerEvent): void {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettingsOpen(false);
    }
    function dismissWithEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      settingsButtonRef.current?.focus();
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [settingsOpen]);

  function changeThrottle(index: number): void {
    setThrottle(index);
    try { localStorage.setItem(throttleStorageKey, String(index)); } catch {}
  }

  useEffect(() => {
    if (!ready || !runtime || !cat) return;
    const design = runtime.model.serializeDesign(cat);
    frameRef.current?.contentWindow?.postMessage({type:"voyage-cat", pixels:design.pixels, name:design.appearance.name},location.origin);
  }, [cat, ready, runtime]);

  useEffect(() => {
    const node = sceneRef.current;
    if (!node) return;
    let inView = false;
    const sync = (): void => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    function receive(event: MessageEvent): void {
      if (event.origin !== location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "voyage-edit-cat") {
        window.dispatchEvent(new Event("open-cat-builder"));
        return;
      }
      if (event.data?.type === "voyage-instruments") {
        const { fuel, colour, pixels } = event.data;
        if (typeof fuel === "number" && Number.isFinite(fuel) && typeof colour === "string" && Array.isArray(pixels)) {
          setInstruments({fuel: Math.max(0, Math.min(100, fuel)), colour, pixels});
        }
        return;
      }
      if (event.data?.type !== "voyage-status" || typeof event.data.label !== "string" || typeof event.data.planet !== "string") return;
      setCaption(`${event.data.label} · ${event.data.planet}`);
    }
    window.addEventListener("message", receive);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("message", receive);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({ type: "voyage-visibility", visible: running }, location.origin);
  }, [ready, running]);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({type: "voyage-throttle", index: throttle}, location.origin);
  }, [ready, throttle]);



  return <div className="homeVoyage" ref={sceneRef} data-running={running} data-power={powerNames[throttle]}>
    <div className="homeVoyageWindow" data-ready={ready}>
      <iframe ref={frameRef} src="/space-demo/lockscreen.html?homepage&v=20261017-controls" title="Space Cadet visiting planets"
        sandbox="allow-scripts allow-same-origin" onLoad={() => setReady(true)} />
    </div>
    <div className="homeVoyageFooter">
      <div className="homeVoyageStory"><span className="voyageStatusDot" aria-hidden="true" /><span>{caption}</span></div>
      <div className="voyageActions">
        <button type="button" className="voyageCustomise" onClick={openBuilder} aria-haspopup="dialog" aria-label="Customise cat — make it a little you">
          <span className="voyageCrewPortrait" aria-hidden="true">{portrait && <CatPortrait pixels={portrait.pixels} name={portrait.appearance.name}/>}</span>
          <span>Make it a little you</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z"/></svg>
        </button>
        <div className="voyageSettings" ref={settingsRef}>
          <button ref={settingsButtonRef} type="button" className="voyageSettingsToggle" aria-label="Voyage settings" title="Voyage settings"
            aria-haspopup="dialog" aria-expanded={settingsOpen} aria-controls="voyage-settings" onClick={() => setSettingsOpen(!settingsOpen)}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
              <path d="m10 3-.6 2.1-1.7 1-2.1-.5-2 3.4 1.5 1.6v2L3.6 14l2 3.5 2.1-.5 1.7 1L10 20h4l.6-2 1.7-1 2.1.5 2-3.5-1.5-1.4v-2L20.4 9l-2-3.4-2.1.5-1.7-1L14 3z"/>
              <circle cx="12" cy="11.5" r="3"/>
            </svg>
          </button>
          {settingsOpen && <div id="voyage-settings" className="voyageSettingsPanel" role="dialog" aria-label="Voyage settings"
            onBlur={event => { if (event.relatedTarget && !settingsRef.current?.contains(event.relatedTarget)) setSettingsOpen(false); }}>
            <div className="voyageSettingsHeader"><strong>Your little universe</strong><button type="button" aria-label="Close voyage settings" onClick={() => { setSettingsOpen(false); settingsButtonRef.current?.focus(); }}>×</button></div>
            <div className="voyagePower">
              <div className="voyageFuel" aria-label={instruments ? `Rocket fuel ${instruments.fuel}%` : "Rocket fuel"}>
                <svg viewBox="-1 -1 18 22" shapeRendering="crispEdges" aria-hidden="true">{instruments?.pixels.map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.w} height={pixel.h} fill={pixel.colour}/>)}</svg>
                <span>{instruments ? `${instruments.fuel}%` : "—"}</span>
              </div>
              <div className="voyageThrottle">
                <label htmlFor="voyage-throttle">Journey speed</label>
                <div className="voyageLever">
                  <input id="voyage-throttle" type="range" min="0" max="2" step="1" value={throttle}
                    aria-label="Voyage power" aria-orientation="vertical" aria-valuetext={`${powerNames[throttle]} power`} aria-describedby="voyage-speed-hint"
                    onChange={event => changeThrottle(Number(event.currentTarget.value))}/>
                  <div className="voyagePowerStops">{[2,1,0].map(index => <button key={index} type="button" aria-label={`${powerNames[index]} voyage power`} aria-pressed={index === throttle} onClick={() => changeThrottle(index)}>{powerNames[index]}</button>)}</div>
                </div>
              </div>
            </div>
            <p id="voyage-speed-hint" className="voyageSettingsHint">Just the animation. Your Mac’s power stays the same.</p>
            <SpaceMotionControl />
            <a className="voyagePyramidLink" onClick={() => trackSiteAction("download_clicked", "mac")} href={getDirectDownloadUrl()} title="Download Local AI Cat"><span className="spacePyramidIcon" aria-hidden="true" /> Find out more about the pyramids</a>
          </div>}
        </div>
      </div>
    </div>
    {studioUI}
  </div>;
}
