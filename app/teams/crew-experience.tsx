"use client";

import { TeamPlans } from "../_components/team-plans";
import { PixelCat } from "../_components/pixel-cat";
import { useSiteMode } from "../_components/site-mode";

export function CrewExperience() {
  const [mode] = useSiteMode();
  return (
    <section className="contentPage crewPage">
      <div className="contentHero">
        {mode === "space" && <div className="crewPortraits" aria-hidden="true"><PixelCat decorative /><PixelCat decorative /><PixelCat decorative /></div>}
        <h1 className="contentTitle">{mode === "space" ? "Bring your crew." : "Local AI for your team."}</h1>
        <p className="contentIntro">Private AI, transcription and everyday Mac tools. A license for each person, with a rollout that fits your organisation.</p>
      </div>
      <TeamPlans />
    </section>
  );
}
