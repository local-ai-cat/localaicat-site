"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { businessPlans, directPlans } from "../../lib/catalog";
import { EarthPersonalitySelector, ModeSelector, useSiteMode } from "./site-mode";
import { CliInstall, DownloadPair } from "./home-downloads";
import { SpaceLaunchPad, SpaceMissions } from "./space-experience";
import { HeroCat } from "./hero-cat";
import { SpaceAtmosphere } from "./space-atmosphere";
import { HomeVoyage } from "./home-voyage";
import { MODES, type Mode } from "../../lib/site-personality";

const heroHeadlines: Record<Mode, string> = {
  space: "A little universe.\nRight on your Mac.",
  personal: "Private AI.\nYour device.",
  business: "Serious local AI\nfor teams."
};

const heroTaglines: Record<Mode, string> = {
  space: "On-device chat, transcription, and models. Local on device by default.\nNo cloud. No tracking. Just you and your cat.",
  personal: "On-device chat, transcription, and models. Local on device by default.\nNo cloud. No tracking. Just you and your cat.",
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
    name: "Menu-bar transcription",
    icon: "menubar",
    blurb: "A global hotkey that transcribes into any app, from the menu bar.",
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

export function HomeExperience() {
  const [mode] = useSiteMode();
  const [earthMode, setEarthMode] = useState<"personal" | "business">("personal");
  // Retain the outgoing portrait while its world fades out. Update before paint
  // when entering Earth, including direct links and keyboard navigation.
  if (mode !== "space" && mode !== earthMode) setEarthMode(mode);
  const inSpace = mode === "space";
  const [heroSwitchVisible, setHeroSwitchVisible] = useState(true);
  const [chipLift, setChipLift] = useState(0);
  const switchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    [
      "/assets/cat-personal-favicon-32.png",
      "/assets/cat-personal-favicon-180.png",
      "/assets/cat-personal-favicon-192.png",
      "/assets/cat-business-favicon-32.png",
      "/assets/cat-business-favicon-180.png",
      "/assets/cat-business-favicon-192.png",
      "/assets/cat.webp"
    ].forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const node = switchRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setHeroSwitchVisible(entry.isIntersecting));
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Space keeps its header in view, so the header switch stands in for the
  // hero switch once that scrolls away, instead of a floating chip.
  useEffect(() => {
    document.body.dataset.heroSwitch = heroSwitchVisible ? "visible" : "hidden";
    return () => { delete document.body.dataset.heroSwitch; };
  }, [heroSwitchVisible]);

  useEffect(() => {
    if (heroSwitchVisible || inSpace) return;

    // The cookie-consent banner is a fixed full-width dialog at the bottom;
    // float the chip above it while it's on screen.
    const update = () => {
      const banner = document.getElementById("cookie-consent-banner");
      setChipLift(banner ? banner.getBoundingClientRect().height + 12 : 0);
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [heroSwitchVisible, inSpace]);

  return (
    <div className={`homeMode homeMode-${mode} homeMode${mode.charAt(0).toUpperCase() + mode.slice(1)}`}>
      {/* ── Hero: headline → downloads → switch → cat ── */}
      <section className="heroTight">
        <SpaceAtmosphere active={inSpace} />
        <div aria-hidden="true" className={`floatingCats ${mode === "personal" ? "floatingCatsVisible" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="floatingCat floatingCatOne" src="/assets/cat.webp" width={56} height={56} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="floatingCat floatingCatTwo" src="/assets/cat.webp" width={60} height={60} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="floatingCat floatingCatThree" src="/assets/cat.webp" width={48} height={48} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="floatingCat floatingCatFour" src="/assets/cat.webp" width={54} height={54} />
        </div>

        <div className="heroTightInner">
          <div className="heroHeadline heroEnter heroEnter1">
            <h1 className="heroCopyStack">
              {MODES.map(item => <span key={item} className="heroCopyLayer" data-active={mode === item} aria-hidden={mode !== item} inert={mode !== item}>{heroHeadlines[item]}</span>)}
            </h1>
            <p className="heroTagline heroCopyStack">
              {MODES.map(item => <span key={item} className="heroCopyLayer" data-active={mode === item} aria-hidden={mode !== item} inert={mode !== item}>{heroTaglines[item]}</span>)}
            </p>
          </div>

          <DownloadPair id="download" />
          <div className="heroWorldStage">
            <div className="heroWorldPanel" data-active={inSpace} aria-hidden={!inSpace} inert={!inSpace}>
              <HomeVoyage active={inSpace} />
            </div>
            <div className="heroWorldPanel heroEarthCompanion" data-active={!inSpace} aria-hidden={inSpace} inert={inSpace}>
              <HeroCat mode={earthMode} />
              <EarthPersonalitySelector persistent />
            </div>
          </div>
          <div className="heroPersonalityControl" ref={switchRef}><ModeSelector compact /></div>

        </div>
      </section>

      {!inSpace && <section className="downloadBand heroEnter heroEnter4">
        {mode === "business" && (
          <div className="bizBand bizBandCompact heroModeFade" key="biz-note">
            <p className="bizBandText">
              <strong>For teams &amp; enterprise</strong> — seat-based pricing,
              granular security controls, and compile-time feature stripping for
              custom builds.
            </p>
            <div className="bizBandActions">
              <Link className="secondaryButton" href="/team">Team pricing</Link>
              <Link className="secondaryButton" href="/contact">Talk to us</Link>
            </div>
          </div>
        )}
        <CliInstall />
      </section>}

      {!inSpace && !heroSwitchVisible && <div className="floatingPersonality" style={chipLift ? { bottom: 22 + chipLift } : undefined}><ModeSelector compact/></div>}
      {inSpace && <SpaceMissions/>}

      {/* ── Pricing (mode-dependent) ── */}
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

            <div className="homePlanGrid">
              <article className="homePlanCard">
                <p className="dualCardEyebrow">Free</p>
                <p className="homePlanPrice">£0</p>
                <p className="dualCardBody">The full local core, forever. No account, no trial clock.</p>
              </article>
              {directPlans.map((plan) => {
                const best = plan.name === "Pro Annual";
                return (
                  <article className={best ? "homePlanCard homePlanCardBest" : "homePlanCard"} key={plan.name}>
                    <p className="dualCardEyebrow">
                      {plan.name}
                      {best && <span className="dualCardBadge">Best value</span>}
                    </p>
                    <p className="homePlanPrice">
                      {plan.price}
                      <span className="homePlanCadence">{plan.cadence}</span>
                    </p>
                    <p className="dualCardBody">{plan.note}</p>
                  </article>
                );
              })}
            </div>

            <div className="pricingActions">
              <Link className="planButton" href="/pricing/direct">Full pricing</Link>
              <Link className="secondaryButton" href="/pricing/app-store">App Store pricing</Link>
            </div>

            <div className="bizBand">
              <p className="bizBandText">
                <strong>Teams &amp; enterprise</strong> — seat-based rollout from
                £40/seat/year, or a sales-led path with invoicing and managed
                rollout.
              </p>
              <div className="bizBandActions">
                <Link className="secondaryButton" href="/team">Team checkout</Link>
                <Link className="secondaryButton" href="/contact">Contact sales</Link>
              </div>
            </div>
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

            <div className="bizPlanGrid">
              {businessPlans.map((plan) => (
                <article
                  className={plan.name === "Team" ? "homePlanCard homePlanCardBest bizPlanCard" : "homePlanCard bizPlanCard"}
                  key={plan.name}
                >
                  <p className="dualCardEyebrow">{plan.name}</p>
                  <p className="homePlanPrice">
                    {plan.price}
                    <span className="homePlanCadence">{plan.cadence}</span>
                  </p>
                  <p className="dualCardBody">{plan.note}</p>
                  <ul className="dualCardList">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <Link className="planButton bizPlanButton" href={plan.ctaHref}>
                    {plan.ctaLabel}
                  </Link>
                </article>
              ))}
            </div>

            <div className="enterpriseBand">
              <div className="enterpriseBandText">
                <p className="sectionEyebrow">Compile-time builds</p>
                <h3>Know your exact attack surface.</h3>
                <p>
                  For enterprise clients we include or exclude features at build
                  time. The binary you roll out contains exactly the
                  capabilities you&apos;ve approved — and none of the threat
                  vectors you haven&apos;t. Every build maps to a published
                  feature manifest, so security review covers what actually
                  ships.
                </p>
              </div>
              <Link className="planButton" href="/contact">Talk to us</Link>
            </div>
          </div>
        )}
      </section>

      {/* ── Feature set ── */}
      <section className="detailBand" id="features">
        <div className="sectionHeading sectionHeadingCentered">
          <p className="sectionEyebrow">What&apos;s inside</p>
          <h2>One cat, many tricks.</h2>
          <p className="detailIntro">
            Everything runs on your device. Features marked Outdoor need the
            direct-download build.
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

        <div className="pricingActions">
          <Link className="secondaryButton" href="/docs">See every feature and which edition has it</Link>
        </div>
      </section>
      {inSpace && <SpaceLaunchPad/>}
    </div>
  );
}
