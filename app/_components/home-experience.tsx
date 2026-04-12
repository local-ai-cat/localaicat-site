"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DragToggle } from "./drag-toggle";
import { persistSiteMode } from "./site-mode";

type Mode = "personal" | "business";

function getInitialMode(): Mode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("site-mode");
    if (stored === "personal" || stored === "business") return stored;
  }
  return "business";
}

export function HomeExperience() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [personalPath, setPersonalPath] = useState<"direct" | "appstore">("appstore");
  const [businessPath, setBusinessPath] = useState<"team" | "enterprise">("team");
  const [detailsVisible, setDetailsVisible] = useState(false);
  const detailsRef = useRef<HTMLElement | null>(null);
  const switchRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLSpanElement | null>(null);
  const personalImgRef = useRef<HTMLImageElement | null>(null);
  const businessImgRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{ startX: number; startMode: Mode; dragging: boolean } | null>(null);

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
    ["/assets/cat-personal.png", "/assets/cat-business.png", "/assets/cat.webp"].forEach(
      (src) => {
        const img = new window.Image();
        img.src = src;
      }
    );
  }, []);

  useEffect(() => {
    persistSiteMode(mode);
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon) {
      favicon.href = mode === "business" ? "/assets/cat-business.png" : "/assets/cat-personal.png";
    }
  }, [mode]);

  useEffect(() => {
    const node = detailsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDetailsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`homeMode homeMode${mode === "personal" ? "Personal" : "Business"}`}>
      {/* ── Hero ── */}
      <section className="homeHero homeHeroCompact">
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

        <div className="heroMinimalFrame heroMinimalFrameCompact">
          <div className="heroImageFrame heroImageFrameCompact">
            <span
              className={`heroCatImage ${mode === "personal" ? "isVisible" : ""}`}
              ref={personalImgRef}
            >
              <Image
                alt="Local AI Cat personal mark"
                src="/assets/cat-personal.png"
                fill
                sizes="(max-width: 760px) 100vw, 640px"
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
                sizes="(max-width: 760px) 100vw, 640px"
                priority
              />
            </span>
          </div>

          <div className="heroHeadline">
            <h1>{mode === "personal" ? "Private AI.\nYour device." : "Serious local AI\nfor teams."}</h1>
            <p className="heroTagline">
              {mode === "personal"
                ? "On-device chat, transcription, and models. No cloud. No tracking. Just you and your cat."
                : "Secure AI, transcription, window management and wellness."}
            </p>
          </div>

          <div className="heroControlStack heroControlStackCentered">
            <div
              aria-label="Audience mode"
              className="modeSwitch"
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
                onClick={() => setMode(mode === "personal" ? "business" : "personal")}
                role="tab"
                type="button"
              >
                Personal
              </button>
              <button
                aria-selected={mode === "business"}
                className={mode === "business" ? "isActive" : undefined}
                onClick={() => setMode(mode === "business" ? "personal" : "business")}
                role="tab"
                type="button"
              >
                Business
              </button>
            </div>

            <svg aria-hidden="true" className="heroScrollHint" fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path
                d="M12 5v14M6 13l6 6 6-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Paths section ── */}
      <section
        className={`detailBand detailBandMinimal sectionReveal ${detailsVisible ? "isVisible" : ""}`}
        id="download-paths"
        ref={detailsRef}
      >
        <div className="sectionHeading sectionHeadingCentered">
          <p className="sectionEyebrow">
            {mode === "personal" ? "Choose your path" : "Two lanes"}
          </p>
          <h2>{mode === "personal" ? "Free to start." : "Team or Enterprise."}</h2>
        </div>

        {mode === "personal" ? (
          <div className="toggleCardSection sectionChildReveal">
            <DragToggle
              labels={["Indoor Cat", "Outdoor Cat"]}
              onChange={setPersonalPath}
              options={["appstore", "direct"] as const}
              size="compact"
              value={personalPath}
            />
            <div className="toggleCardPanel">
              {personalPath === "appstore" ? (
                <article className="toggleCard" key="appstore">
                  <p className="dualCardEyebrow">Indoor Cat</p>
                  <h3>App Store for iPhone, iPad, and Mac.</h3>
                  <p className="dualCardBody">
                    Apple billing and the simplest install path. On Mac, sandboxing limits some desktop features — for the full macOS experience, we recommend{" "}
                    <button
                      className="inlineToggleLink"
                      onClick={() => setPersonalPath("direct")}
                      type="button"
                    >
                      Outdoor Cat
                    </button>.
                  </p>
                  <ul className="dualCardList">
                    <li>iPhone, iPad, and Mac</li>
                    <li>Apple billing and restore flow</li>
                    <li>Pro: £4/mo or £40/yr</li>
                    <li>Developer Mode: £10 one-time</li>
                    <li>Best for iPhone &amp; iPad</li>
                  </ul>
                  <div className="dualCardActions">
                    <Link className="planButton" href="/download/app-store">App Store</Link>
                    <Link className="secondaryButton" href="/pricing/app-store">Pricing</Link>
                  </div>
                </article>
              ) : (
                <article className="toggleCard" key="direct">
                  <p className="dualCardEyebrow">Outdoor Cat</p>
                  <h3>Direct download for Mac.</h3>
                  <p className="dualCardBody">
                    Web billing and the full macOS feature set, including desktop tools that are limited in the App Store build.
                  </p>
                  <ul className="dualCardList">
                    <li>Mac-only direct build</li>
                    <li>Full macOS desktop feature set</li>
                    <li>Pro: £4/mo or £40/yr</li>
                    <li>Developer Mode: £10 one-time</li>
                    <li>Best for full Mac use</li>
                  </ul>
                  <div className="dualCardActions">
                    <Link className="planButton" href="/download/direct">Download</Link>
                    <Link className="secondaryButton" href="/pricing/direct">Pricing</Link>
                  </div>
                </article>
              )}
            </div>
          </div>
        ) : (
          <div className="toggleCardSection sectionChildReveal">
            <DragToggle
              labels={["Team", "Enterprise"]}
              onChange={setBusinessPath}
              options={["team", "enterprise"] as const}
              size="compact"
              value={businessPath}
            />
            <div className="toggleCardPanel">
              {businessPath === "team" ? (
                <article className="toggleCard" key="team">
                  <p className="dualCardEyebrow">Team</p>
                  <h3>Self-serve rollout.</h3>
                  <p className="dualCardPrice">from £40/seat/year</p>
                  <p className="dualCardBody">Seat-based access for small teams that want the full Mac feature set and more granular security controls.</p>
                  <ul className="dualCardList">
                    <li>Minimum 2 seats</li>
                    <li>Direct app rollout</li>
                    <li>Can stay fully local without iCloud</li>
                    <li>Self-serve billing</li>
                    <li>Standard support</li>
                  </ul>
                  <div className="dualCardActions">
                    <Link className="planButton" href="/team">Get started</Link>
                    <Link className="secondaryButton" href="/pricing/direct">View pricing</Link>
                  </div>
                </article>
              ) : (
                <article className="toggleCard" key="enterprise">
                  <p className="dualCardEyebrow">Enterprise</p>
                  <h3>Sales-led path.</h3>
                  <p className="dualCardPrice">custom</p>
                  <p className="dualCardBody">Deployment, invoicing, packaging, rollout support, and more granular security controls.</p>
                  <ul className="dualCardList">
                    <li>Custom seat count</li>
                    <li>Fully local-only rollout options</li>
                    <li>Managed rollout &amp; packaging</li>
                    <li>Procurement &amp; invoicing</li>
                    <li>Custom onboarding</li>
                  </ul>
                  <div className="dualCardActions">
                    <Link className="planButton" href="/contact">Contact sales</Link>
                  </div>
                </article>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
