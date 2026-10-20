"use client";

import { useEffect, useState } from "react";
import { EarthPersonalitySelector, ModeSelector, useSiteMode } from "./site-mode";
import { CliInstall, DownloadPair } from "./home-downloads";
import { SpaceLaunchPad } from "./space-experience";
import { HeroCat } from "./hero-cat";
import { SpaceAtmosphere } from "./space-atmosphere";
import { HomeVoyage } from "./home-voyage";
import { PersonalPlans } from "./personal-plans";
import { productSummary } from "../../lib/product-facts";
import { TeamPlans } from "./team-plans";
import { ScrollArrival } from "./scroll-arrival";
import { AppDemo, type AppDemoSource } from "./app-demo";
import { MODES, type Mode } from "../../lib/site-personality";

const heroHeadlines: Record<Mode, string> = {
  space: "A little universe.\nRight on your Mac.",
  personal: "Private AI.\nYour device.",
  business: "Serious local AI\nfor teams."
};

const heroTaglines: Record<Mode, string> = {
  space: "On-device chat, transcription, and models.\nNo cloud. No tracking. Just you and your cat.",
  personal: "On-device chat, transcription, and models.\nNo cloud. No tracking. Just you and your cat.",
  business: "Secure AI, transcription, window management and wellness — rolled out on your terms."
};

const marqueeFeatures = [
  {
    name: "Local AI chat",
    icon: "chat",
    blurb: "Chat with open models running on your Mac's own silicon. Nothing leaves the device.",
    outdoorOnly: false
  },
  {
    name: "Transcription",
    icon: "mic",
    blurb: "Fast, private speech-to-text. Record or import audio; everything is processed locally.",
    outdoorOnly: false
  },
  {
    name: "Menu-bar tools",
    icon: "menubar",
    blurb: "Transcription and handy everyday controls. Many work in the App Store app; some require Outdoor.",
    outdoorOnly: true
  },
  {
    name: "Translate",
    icon: "translate",
    blurb: "On-device translation, including live two-way conversation mode.",
    outdoorOnly: false
  },
  {
    name: "Window management",
    icon: "windows",
    blurb: "Snap and arrange windows across every app on your Mac.",
    outdoorOnly: true
  },
  {
    name: "Monitor control",
    icon: "monitor",
    blurb: "Brightness and volume for external displays, right from the menu bar.",
    outdoorOnly: true
  },
  {
    name: "Screen Awake & Eye Care",
    icon: "eye",
    blurb: "Keep the screen awake when it matters and rest your eyes when it doesn't.",
    outdoorOnly: false
  },
  {
    name: "Local API",
    icon: "terminal",
    blurb: "An OpenAI-compatible endpoint on localhost, so your tools and agents can use your local models.",
    outdoorOnly: true
  }
] as const;

const featureIconPaths: Record<string, string> = {
  chat: "M4 5.5h16v10.5H9.5L5 20v-4H4z",
  mic: "M9 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM6 11a6 6 0 0 0 12 0M12 17v3.5",
  menubar: "M3 4.5h18v15H3zM3 8.5h18M16.8 6.5h.01",
  translate: "M3.5 5.5h9M8 5.5c-.3 4-2 6.8-4.5 8.7M6 8c1.6 3 3.9 5 6.5 6.2M13.5 19l3.6-9 3.4 9M14.9 16h4.4",
  windows: "M4 4h10v10H4zM10 10h10v10H10z",
  monitor: "M3 5h18v12H3zM12 17v3M8.5 20h7",
  eye: "M2.5 12S6.4 6 12 6s9.5 6 9.5 6-3.9 6-9.5 6-9.5-6-9.5-6zM14.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  terminal: "M5.5 8.5l4 3.5-4 3.5M12.5 15.5h6"
};

function FeatureIcon({ kind }: { kind: string }) {
  return (
    <span aria-hidden="true" className="featureIcon">
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="20">
        <path d={featureIconPaths[kind] ?? featureIconPaths.chat} />
      </svg>
    </span>
  );
}

/**
 * The three worlds crossfade in place. Only the active world's words are text: the others are drawn from
 * `data-text`, so crawlers and screen readers read one headline, not all three run together.
 */
function CopyLayers({ copy, mode }: { copy: Record<Mode, string>; mode: Mode }): React.JSX.Element {
  return <>{MODES.map(item => {
    const active = mode === item;
    return <span key={item} className="heroCopyLayer" data-active={active} aria-hidden={!active} inert={!active}
      data-text={active ? undefined : copy[item]}>{active ? copy[item] : null}</span>;
  })}</>;
}

export function HomeExperience({ demo }: { demo?: AppDemoSource }) {
  const [mode] = useSiteMode();
  const [earthMode, setEarthMode] = useState<"personal" | "business">("personal");
  // Retain the outgoing portrait while its world fades out. Update before paint
  // when entering Earth, including direct links and keyboard navigation.
  if (mode !== "space" && mode !== earthMode) setEarthMode(mode);
  const inSpace = mode === "space";

  useEffect(() => {
    [
      "/assets/cat-personal-favicon-32.png",
      "/assets/cat-personal-favicon-180.png",
      "/assets/cat-personal-favicon-192.png",
      "/assets/cat-business-favicon-32.png",
      "/assets/cat-business-favicon-180.png",
      "/assets/cat-business-favicon-192.png"
    ].forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  return (
    <div className={`homeMode homeMode-${mode} homeMode${mode.charAt(0).toUpperCase() + mode.slice(1)}`}>
      {/* ── Hero: headline → world switch → cat → installation options ── */}
      <section className="heroTight">
        <SpaceAtmosphere active={inSpace} />
        <div className="heroTightInner">
          <div className="heroHeadline heroEnter heroEnter1">
            <h1 className="heroCopyStack"><CopyLayers copy={heroHeadlines} mode={mode} /></h1>
            <p className="heroTagline heroCopyStack"><CopyLayers copy={heroTaglines} mode={mode} /></p>
          </div>

          <div className="heroPersonalityControl"><ModeSelector compact /></div>
          <div className="heroWorldStage">
            <div className="heroWorldPanel" data-active={inSpace} aria-hidden={!inSpace} inert={!inSpace}>
              <HomeVoyage active={inSpace} />
            </div>
            <div className="heroWorldPanel heroEarthCompanion" data-active={!inSpace} aria-hidden={inSpace} inert={inSpace}>
              <HeroCat mode={earthMode} />
              <EarthPersonalitySelector persistent />
            </div>
          </div>

        </div>
      </section>

      <section className="downloadBand" id="download" aria-label="Install Local AI Cat">
        <DownloadPair />
        <CliInstall />
      </section>

      <AppDemo source={demo} />

      {/* ── Pricing (mode-dependent) ── */}
      <ScrollArrival>
        <section className="detailBand" id="pricing">
        {mode !== "business" ? (
          <div className="heroModeFade" key="pricing-personal">
            <div className="sectionHeading sectionHeadingCentered">
              <p className="sectionEyebrow">Pricing</p>
              <h2>Free core. Fair upgrades.</h2>
              <p className="detailIntro">
                The app is free — chat, transcription, and models included, no
                account required. Pro and Developer Mode unlock the extras.
              </p>
            </div>

            <PersonalPlans />
          </div>
        ) : (
          <div className="heroModeFade" key="pricing-business">
            <div className="sectionHeading sectionHeadingCentered">
              <p className="sectionEyebrow">Pricing</p>
              <h2>Team &amp; enterprise.</h2>
              <p className="detailIntro">
                Built on Outdoor Cat — the full Mac feature set, rolled out on
                your terms. Fully local if you want it; no iCloud required.
              </p>
            </div>

            <TeamPlans />
          </div>
        )}
        </section>
      </ScrollArrival>

      {/* ── Feature set ── */}
      <ScrollArrival>
        <section className="detailBand" id="features">
        <div className="sectionHeading sectionHeadingCentered">
          <p className="sectionEyebrow">What&apos;s inside</p>
          <h2>One cat, many tricks.</h2>
          <p className="detailIntro">
            {productSummary} Features marked Outdoor are for macOS and require the direct download from this site.
          </p>
        </div>

        <div className="featureGridHome">
          {marqueeFeatures.map((feature) => (
            <article className="featureCellHome" key={feature.name}>
              <FeatureIcon kind={feature.icon} />
              <h3>
                {feature.name}
                {feature.outdoorOnly && <span className="featureBadgeOutdoor">Outdoor</span>}
              </h3>
              <p>{feature.blurb}</p>
            </article>
          ))}
        </div>

      </section>
      </ScrollArrival>
      {inSpace && <SpaceLaunchPad/>}
    </div>
  );
}
