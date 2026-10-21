"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelCat } from "./pixel-cat";
import { PixelShip } from "./space-experience";
import { useCatStudio } from "./use-cat-studio";

type Experience = "cockpit" | "voyage";
const experiences = {
  cockpit: {
    title: "Your everyday co-pilot",
    description: "Try the cat menu and its little controls. This browser demo leaves your Mac settings alone.",
    src: "/space-demo/cockpit.html?embedded"
  },
  voyage: {
    title: "Gone exploring",
    description: "Settle in for a little expedition. This preview does not lock your screen.",
    src: "/space-demo/lockscreen.html?embedded"
  }
};

function ExperienceOverlay({ experience, onClose }: { experience: Experience; onClose(): void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = experiences[experience];

  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      focused?.focus({ preventScroll: true });
    };
  }, []);

  // Escape inside the first-party iframe should also dismiss its outer dialog.
  function bindFrameEscape(): void {
    frameRef.current?.contentDocument?.addEventListener("keydown", event => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (frameRef.current?.contentDocument?.querySelector("dialog[open]")) return;
      event.preventDefault();
      onClose();
    });
  }

  return <dialog ref={dialogRef} className="experienceOverlay" aria-labelledby="experience-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="experienceOverlayContent">
      <header className="experienceOverlayHeader">
        <div><h2 id="experience-title">{item.title}</h2><p>{item.description}</p></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close experience">×</button>
      </header>
      <iframe ref={frameRef} title={item.title} src={item.src} onLoad={bindFrameEscape}
        sandbox="allow-scripts allow-same-origin allow-downloads" />
    </div>
  </dialog>;
}

export function SpaceDesigns() {
  const { openBuilder, studioUI } = useCatStudio();
  const [experience, setExperience] = useState<Experience | null>(null);

  return <div className="spaceDesigns">
    <Link className="spaceBack" href="/?mode=space">Back to Local AI Cat</Link>
    <header className="designsIntro">
      <span className="designsCompanion" aria-hidden="true"><PixelCat decorative /><PixelShip /></span>
      <h1>A little universe<br />to make your own.</h1>
      <p>A curious cat, a tiny cockpit and a galaxy with a few surprises.<br className="designsWideBreak" /> Come and have a look around.</p>
    </header>

    <section className="spaceMissions" aria-labelledby="space-missions-title">
      <h2 id="space-missions-title">Three little missions.</h2>
      <div className="spaceDestinations">
        <button type="button" className="spaceDestination destinationStudio" onClick={openBuilder} aria-haspopup="dialog">
          <div className="miniWardrobe" aria-hidden="true"><PixelCat palette="peach" decorative /><PixelCat palette="classic" decorative /><PixelCat palette="mint" decorative /></div>
          <div className="spaceDestinationText"><span className="missionNumber">Mission 01</span><h3>A cat that feels like you</h3><p>A name, a colour, a delightfully silly hat. Your cat code brings it all along.</p><span className="missionGo">Open the Cat studio</span></div>
        </button>
        <button type="button" className="spaceDestination destinationCockpit" onClick={() => setExperience("cockpit")} aria-haspopup="dialog">
          <div className="miniMenu" aria-hidden="true"><div className="miniMenuBar"><span>● &nbsp; Finder</span><span>✦ &nbsp; 9:41</span></div><div className="miniMenuPopover"><PixelCat decorative /><PixelShip /><div className="miniThrottle" /></div></div>
          <div className="spaceDestinationText"><span className="missionNumber">Mission 02</span><h3>Your everyday co-pilot</h3><p>A little company in your menu bar, with useful things close to paw.</p><span className="missionGo">Try the menu bar</span></div>
        </button>
        <button type="button" className="spaceDestination destinationVoyage" onClick={() => setExperience("voyage")} aria-haspopup="dialog">
          <div className="miniVoyage" aria-hidden="true"><div className="miniMoon" /><PixelCat decorative /><span>✦</span></div>
          <div className="spaceDestinationText"><span className="missionNumber">Mission 03</span><h3>Gone exploring</h3><p>Little worlds, long spacewalks and the occasional very important round of golf.</p><span className="missionGo">Watch the night voyage</span></div>
        </button>
      </div>
    </section>

    {studioUI}
    <section className="designsUniverse" aria-labelledby="universe-title">
      <div className="universeOrbit" aria-hidden="true"><span /><PixelCat decorative /><PixelShip /></div>
      <div><h2 id="universe-title">Small cat.<br />Unreasonably big universe.</h2>
        <p>The next planet is a little different every time. Your cat might tend a tiny farm, find a dance machine or stop at an outpost to refuel.</p>
        <p>It is a place for slow moments and small surprises. The pyramids? The cats have been around for a while. They are not saying much.</p>
        <p>Your cat travels with you: the same colours, the same little face, wherever the adventure goes.</p>
      </div>
    </section>

    <section className="designsWorkshop" aria-labelledby="workshop-title">
      <h2 id="workshop-title">A little more space to play.</h2>
      <p>The sketchbook behind this universe. Explore the interactive designs and experiments we are working on.</p>
      <nav aria-label="App designs and experiments">
        <a href="/space-demo/direction.html">App, menu bar &amp; icons</a>
        <a href="/space-demo/cadet-v2.html">Costumes &amp; accessories</a>
        <a href="/space-demo/cadet.html#g2-study">Glasses &amp; G2 studies</a>
        <a href="/space-demo/thermal.html">The paper press</a>
        <a href="/share-study/index.html">Postcards from space</a>
      </nav>
      <small>These are browser experiments. Features in the app vary by version and platform.</small>
    </section>
    {experience && <ExperienceOverlay experience={experience} onClose={() => setExperience(null)} />}
  </div>;
}
