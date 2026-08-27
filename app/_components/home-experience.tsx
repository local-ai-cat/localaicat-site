"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAppStoreUrl,
  getDirectDownloadUrl,
  getDirectDownloadVersion,
  getDirectInstallScriptCommand,
  getHomebrewInstallCommand
} from "../../lib/env";
import { businessPlans, directPlans } from "../../lib/catalog";
import { persistSiteMode } from "./site-mode";

type Mode = "personal" | "business";

function getInitialMode(): Mode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("site-mode");
    if (stored === "personal" || stored === "business") return stored;
  }
  return "personal";
}

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

function CopyCommand({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        /* clipboard unavailable — leave the text selectable */
      });
  }, [command]);

  return (
    <div className="termCommandRow">
      <span className="termCommandLabel">{label}</span>
      <code className="termCommandCode">{command}</code>
      <button className="termCopyButton" onClick={copy} type="button">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function AppStoreBadge({ accent = false, href }: { accent?: boolean; href: string }) {
  return (
    <a
      aria-label="Download on the App Store"
      className={accent ? "appStoreBadge appStoreBadgeAccent" : "appStoreBadge"}
      href={href}
    >
      <svg aria-hidden="true" fill="currentColor" height="26" viewBox="0 0 384 512" width="20">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span className="appStoreBadgeText">
        <small>Download on the</small>
        App Store
      </span>
    </a>
  );
}

export function HomeExperience() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [heroSwitchVisible, setHeroSwitchVisible] = useState(true);
  const [chipLift, setChipLift] = useState(0);
  const [cliOpen, setCliOpen] = useState(false);
  // Which install path gets the accent treatment. Detected from the visitor's
  // device after hydration (iOS/iPadOS → Indoor); Mac and everyone else see
  // Outdoor highlighted, matching the server-rendered default.
  const [highlight, setHighlight] = useState<"outdoor" | "indoor">("outdoor");
  const switchRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLSpanElement | null>(null);
  const personalImgRef = useRef<HTMLImageElement | null>(null);
  const businessImgRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{ startX: number; startMode: Mode; dragging: boolean } | null>(null);

  const downloadUrl = getDirectDownloadUrl();
  const version = getDirectDownloadVersion();
  const appStoreUrl = getAppStoreUrl();
  const scriptCmd = getDirectInstallScriptCommand();
  const homebrewCmd = getHomebrewInstallCommand();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = { startX: e.clientX, startMode: mode, dragging: false };
    },
    [mode]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !sliderRef.current || !switchRef.current) return;
      const dx = e.clientX - dragState.current.startX;
      if (!dragState.current.dragging && Math.abs(dx) > 6) {
        dragState.current.dragging = true;
        switchRef.current.setPointerCapture(e.pointerId);
      }
      if (!dragState.current.dragging) return;

      const trackWidth = switchRef.current.offsetWidth / 2 - 4;
      const baseOffset = dragState.current.startMode === "business" ? trackWidth : 0;
      const clamped = Math.max(0, Math.min(trackWidth, baseOffset + dx));

      sliderRef.current.style.transition = "none";
      sliderRef.current.style.transform = `translateX(${clamped}px)`;

      const bizFactor = clamped / trackWidth;

      if (personalImgRef.current && businessImgRef.current) {
        personalImgRef.current.style.transition = "none";
        businessImgRef.current.style.transition = "none";
        personalImgRef.current.style.opacity = `${1 - bizFactor}`;
        personalImgRef.current.style.transform = `scale(${0.98 + 0.02 * (1 - bizFactor)})`;
        businessImgRef.current.style.opacity = `${bizFactor}`;
        businessImgRef.current.style.transform = `scale(${0.98 + 0.02 * bizFactor})`;
      }

      const floatingCats = document.querySelector<HTMLElement>(".floatingCats");
      if (floatingCats) {
        floatingCats.style.transition = "none";
        floatingCats.style.opacity = `${1 - bizFactor}`;
      }

      const brandPersonal = document.querySelector<HTMLElement>(".brandIconImagePersonal");
      const brandBusiness = document.querySelector<HTMLElement>(".brandIconImageBusiness");
      if (brandPersonal && brandBusiness) {
        brandPersonal.style.transition = "none";
        brandBusiness.style.transition = "none";
        brandPersonal.style.opacity = `${1 - bizFactor}`;
        brandPersonal.style.transform = `scale(${0.98 + 0.02 * (1 - bizFactor)})`;
        brandBusiness.style.opacity = `${bizFactor}`;
        brandBusiness.style.transform = `scale(${0.98 + 0.02 * bizFactor})`;
      }
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !sliderRef.current) {
        dragState.current = null;
        return;
      }

      sliderRef.current.style.transition = "";
      sliderRef.current.style.transform = "";

      [personalImgRef.current, businessImgRef.current].forEach((el) => {
        if (el) {
          el.style.transition = "";
          el.style.opacity = "";
          el.style.transform = "";
        }
      });
      const floatingCats = document.querySelector<HTMLElement>(".floatingCats");
      if (floatingCats) {
        floatingCats.style.transition = "";
        floatingCats.style.opacity = "";
      }
      document.querySelectorAll<HTMLElement>(".brandIconImagePersonal, .brandIconImageBusiness")
        .forEach((el) => {
          el.style.transition = "";
          el.style.opacity = "";
          el.style.transform = "";
        });

      if (dragState.current.dragging) {
        const dx = e.clientX - dragState.current.startX;
        const threshold = 30;
        if (dx > threshold && dragState.current.startMode === "personal") {
          setMode("business");
        } else if (dx < -threshold && dragState.current.startMode === "business") {
          setMode("personal");
        }
      }
      dragState.current = null;
    },
    []
  );

  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS reports as "MacIntel" with touch; catch it via maxTouchPoints.
    const isIOS =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) setHighlight("indoor");
  }, []);

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

  useEffect(() => {
    if (heroSwitchVisible) return;

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
  }, [heroSwitchVisible]);

  useEffect(() => {
    persistSiteMode(mode);
    const stem = mode === "business" ? "cat-business-favicon" : "cat-personal-favicon";
    const targets: Array<[string, string]> = [
      ["link[rel='icon']", `/assets/${stem}-32.png`],
      ["link[rel='shortcut icon']", `/assets/${stem}-32.png`],
      ["link[rel='apple-touch-icon']", `/assets/${stem}-180.png`]
    ];
    targets.forEach(([selector, href]) => {
      document.querySelectorAll<HTMLLinkElement>(selector).forEach((link) => {
        link.href = href;
      });
    });
  }, [mode]);

  return (
    <div className={`homeMode homeMode${mode === "personal" ? "Personal" : "Business"}`}>
      {/* ── Hero: headline → switch → cat ── */}
      <section className="heroTight">
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
            <h1 className="heroModeFade" key={`h1-${mode}`}>
              {mode === "personal" ? "Private AI.\nYour device." : "Serious local AI\nfor teams."}
            </h1>
            <p className="heroTagline heroModeFade" key={`tag-${mode}`}>
              {mode === "personal"
                ? "On-device chat, transcription, and models. No cloud. No tracking. Just you and your cat."
                : "Secure AI, transcription, window management and wellness — rolled out on your terms."}
            </p>
          </div>

          <div
            aria-label="Audience mode"
            className="modeSwitch heroEnter heroEnter2"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={switchRef}
            role="tablist"
            style={{ touchAction: "pan-y" }}
          >
            <span
              aria-hidden="true"
              className={`modeSwitchSlider ${mode === "business" ? "modeSwitchSliderRight" : ""}`}
              ref={sliderRef}
            />
            <button
              aria-selected={mode === "personal"}
              className={mode === "personal" ? "isActive" : undefined}
              onClick={() => setMode("personal")}
              role="tab"
              type="button"
            >
              Personal
            </button>
            <button
              aria-selected={mode === "business"}
              className={mode === "business" ? "isActive" : undefined}
              onClick={() => setMode("business")}
              role="tab"
              type="button"
            >
              Business
            </button>
          </div>

          <div className="heroFigure heroEnter heroEnter3">
            <span aria-hidden="true" className="heroGlow" />
            <span
              className={`heroCatImage ${mode === "personal" ? "isVisible" : ""}`}
              ref={personalImgRef}
            >
              <Image
                alt="Local AI Cat personal mark"
                src="/assets/cat-personal.png"
                fill
                sizes="(max-width: 760px) 90vw, 460px"
                priority
              />
            </span>
            <span
              className={`heroCatImage ${mode === "business" ? "isVisible" : ""}`}
              ref={businessImgRef}
            >
              <Image
                alt="Local AI Cat business mark"
                src="/assets/cat-business.png"
                fill
                sizes="(max-width: 760px) 90vw, 460px"
                priority
              />
            </span>
          </div>
        </div>
      </section>

      {/* ── Download: both cats, immediately ── */}
      <section className="downloadBand heroEnter heroEnter4" id="download">
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
        <div className="pathCards pathCardsSlim">
          <article
            className={`pathCard pathCardSlim ${highlight === "indoor" ? "pathCardHighlight" : ""}`}
          >
            <p className="pathCardEyebrow">
              Indoor Cat
              {highlight === "indoor" && (
                <span className="dualCardBadge">For your device</span>
              )}
            </p>
            <h2>App Store for iPhone, iPad &amp; Mac*.</h2>
            <p className="pathCardBody">
              The simplest install — and the only cat on iOS.
            </p>
            <div className="pathCardActions">
              <AppStoreBadge
                accent={highlight === "indoor"}
                href={appStoreUrl}
              />
              <p className="pathCardMeta">Free · Apple billing</p>
              <p className="pathCardMeta pathCardFootnote">
                *for Mac we highly recommend Outdoor Cat
              </p>
            </div>
          </article>

          <article
            className={`pathCard pathCardSlim ${highlight === "outdoor" ? "pathCardHighlight" : ""}`}
          >
            <p className="pathCardEyebrow">
              Outdoor Cat
              {highlight === "outdoor" && (
                <span className="dualCardBadge">Recommended</span>
              )}
            </p>
            <h2>Direct download for Mac.</h2>
            <p className="pathCardBody">
              No sandbox — the complete desktop feature set.
            </p>
            <div className="pathCardActions">
              <a
                className={`planButton ${highlight === "outdoor" ? "planButtonAccent" : "planButtonQuiet"}`}
                href={downloadUrl}
              >
                Download for Mac
              </a>
              <p className="pathCardMeta">
                {version ? `Version ${version} · ` : ""}Free · Signed &amp;
                notarized by Apple
              </p>
            </div>
          </article>
        </div>

        <button
          aria-expanded={cliOpen}
          className="orCliToggle"
          onClick={() => setCliOpen(!cliOpen)}
          type="button"
        >
          …or install with the CLI or brew
          <svg
            aria-hidden="true"
            className={`orCliChevron ${cliOpen ? "isOpen" : ""}`}
            fill="none"
            height="14"
            viewBox="0 0 24 24"
            width="14"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>

        {cliOpen && (
        <div className="termWindow termWindowReveal">
          <div className="termBar">
            <span aria-hidden="true" className="termDot termDotRed" />
            <span aria-hidden="true" className="termDot termDotYellow" />
            <span aria-hidden="true" className="termDot termDotGreen" />
            <span className="termTitle">for the cutes — one line installs it</span>
          </div>
          <video
            aria-label="Terminal recording of the one-line Local AI Cat install"
            autoPlay
            className="termVideo"
            loop
            muted
            playsInline
            src="/assets/install-demo.mp4"
          />
          <div className="termBody">
            {scriptCmd && <CopyCommand command={scriptCmd} label="script" />}
            {homebrewCmd && <CopyCommand command={homebrewCmd} label="brew" />}
          </div>
        </div>
        )}
      </section>

      {!heroSwitchVisible && (
        <div
          aria-label="Audience mode"
          className="modeChip"
          role="tablist"
          style={chipLift ? { bottom: 22 + chipLift } : undefined}
        >
          <button
            aria-selected={mode === "personal"}
            className={mode === "personal" ? "isActive" : undefined}
            onClick={() => setMode("personal")}
            role="tab"
            type="button"
          >
            Personal
          </button>
          <button
            aria-selected={mode === "business"}
            className={mode === "business" ? "isActive" : undefined}
            onClick={() => setMode("business")}
            role="tab"
            type="button"
          >
            Business
          </button>
        </div>
      )}

      {/* ── Pricing (mode-dependent) ── */}
      <section className="detailBand" id="pricing">
        {mode === "personal" ? (
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
          <Link className="secondaryButton" href="/outdoor">See the full Outdoor feature set</Link>
        </div>
      </section>
    </div>
  );
}
