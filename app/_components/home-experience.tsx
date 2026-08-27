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
import { directPlans } from "../../lib/catalog";
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
    blurb: "Chat with open models running on your Mac's own silicon. Nothing leaves the device.",
    outdoorOnly: false
  },
  {
    name: "Transcription",
    blurb: "Fast, private speech-to-text. Record or import audio; everything is processed locally.",
    outdoorOnly: false
  },
  {
    name: "Menu-bar transcription",
    blurb: "A global hotkey that transcribes into any app, from the menu bar.",
    outdoorOnly: true
  },
  {
    name: "Translate",
    blurb: "On-device translation, including live two-way conversation mode.",
    outdoorOnly: false
  },
  {
    name: "Window management",
    blurb: "Snap and arrange windows across every app on your Mac.",
    outdoorOnly: true
  },
  {
    name: "Monitor control",
    blurb: "Brightness and volume for external displays, right from the menu bar.",
    outdoorOnly: true
  },
  {
    name: "Screen Awake & Eye Care",
    blurb: "Keep the screen awake when it matters and rest your eyes when it doesn't.",
    outdoorOnly: false
  },
  {
    name: "Local API",
    blurb: "An OpenAI-compatible endpoint on localhost, so your tools and agents can use your local models.",
    outdoorOnly: true
  }
] as const;

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

export function HomeExperience() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
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
        <div className="pathCards">
          <article className="pathCard pathCardOutdoor">
            <div className="pathCardTop">
              <p className="pathCardEyebrow">
                Outdoor Cat <span className="dualCardBadge">Recommended</span>
              </p>
              <h2>The full feature set.</h2>
              <p className="pathCardBody">
                Downloaded straight from the web, with no sandbox — every desktop
                feature, including the ones the App Store build can&apos;t offer.
              </p>
              <ul className="pathCardList">
                <li>Everything in Indoor Cat, plus:</li>
                <li>Global menu-bar transcription</li>
                <li>Window management across apps</li>
                <li>System-wide hotkeys &amp; shortcuts</li>
                <li>Web billing &amp; portable license keys</li>
              </ul>
            </div>
            <div className="pathCardActions">
              <a className="planButton planButtonAccent" href={downloadUrl}>
                Download for Mac
              </a>
              <p className="pathCardMeta">
                {version ? `Version ${version} · ` : ""}Free to start · Signed &amp;
                notarized by Apple
              </p>
            </div>
          </article>

          <article className="pathCard">
            <div className="pathCardTop">
              <p className="pathCardEyebrow">Indoor Cat</p>
              <h2>The easy path.</h2>
              <p className="pathCardBody">
                Apple billing and the simplest install. On Mac, sandboxing limits
                some desktop features — on iPhone and iPad it&apos;s the only cat in
                town.
              </p>
              <ul className="pathCardList">
                <li>iPhone, iPad &amp; Mac</li>
                <li>Apple billing &amp; restore flow</li>
                <li>On-device chat, transcription &amp; models</li>
                <li>Automatic App Store updates</li>
              </ul>
            </div>
            <div className="pathCardActions">
              <a className="planButton planButtonQuiet" href={appStoreUrl}>
                App Store
              </a>
              <p className="pathCardMeta">iPhone · iPad · Mac · Free to start</p>
            </div>
          </article>
        </div>

        <div className="termWindow">
          <div className="termBar">
            <span aria-hidden="true" className="termDot termDotRed" />
            <span aria-hidden="true" className="termDot termDotYellow" />
            <span aria-hidden="true" className="termDot termDotGreen" />
            <span className="termTitle">for the brave — one line installs it</span>
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
      </section>

      {/* ── Pricing ── */}
      <section className="detailBand" id="pricing">
        <div className="sectionHeading sectionHeadingCentered">
          <p className="sectionEyebrow">Pricing</p>
          <h2>Free core. Fair upgrades.</h2>
          <p className="detailIntro">
            The app is free — chat, transcription, and models included, no account
            required. Pro and Developer Mode unlock the extras.
          </p>
        </div>

        <div className="homePlanGrid">
          <article className="homePlanCard">
            <p className="dualCardEyebrow">Free</p>
            <p className="homePlanPrice">£0</p>
            <p className="dualCardBody">The full local core, forever. No account, no trial clock.</p>
          </article>
          {directPlans.map((plan) => (
            <article className="homePlanCard" key={plan.name}>
              <p className="dualCardEyebrow">{plan.name}</p>
              <p className="homePlanPrice">
                {plan.price}
                <span className="homePlanCadence">{plan.cadence}</span>
              </p>
              <p className="dualCardBody">{plan.note}</p>
            </article>
          ))}
        </div>

        <div className="pricingActions">
          <Link className="planButton" href="/pricing/direct">Full pricing</Link>
          <Link className="secondaryButton" href="/pricing/app-store">App Store pricing</Link>
        </div>

        <div className="bizBand">
          <p className="bizBandText">
            <strong>Teams &amp; enterprise</strong> — seat-based rollout from
            £40/seat/year, or a sales-led path with invoicing and managed rollout.
          </p>
          <div className="bizBandActions">
            <Link className="secondaryButton" href="/team">Team checkout</Link>
            <Link className="secondaryButton" href="/contact">Contact sales</Link>
          </div>
        </div>
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
