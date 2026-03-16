"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "personal" | "business";
type PersonalPath = "direct" | "app-store";
type BusinessPath = "team" | "enterprise";

const personalPanels = {
  direct: {
    eyebrow: "Direct download",
    title: "Get the full experience.",
    summary: "Base experience is free. Paid upgrades unlock early access and the fuller Mac path.",
    price: "Free base app. £4/mo or £40/yr for Pro.",
    detail: "Developer Mode adds £10 one-time.",
    primaryHref: "/download/direct",
    primaryLabel: "Open direct path",
    secondaryHref: "/pricing/direct",
    secondaryLabel: "View direct pricing"
  },
  "app-store": {
    eyebrow: "App Store",
    title: "Stay in the sandbox.",
    summary: "Base experience is free here too. Paid upgrades stay in Apple billing and the sandboxed path.",
    price: "Free base app. £4/mo or £40/yr for Pro.",
    detail: "Developer Mode adds £10 one-time.",
    primaryHref: "/download/app-store",
    primaryLabel: "Open App Store path",
    secondaryHref: "/pricing/app-store",
    secondaryLabel: "View App Store pricing"
  }
} as const;

const businessPanels = {
  team: {
    eyebrow: "Team",
    title: "Roll out the direct build.",
    summary: "Seat-based access for small teams that want the full Mac path.",
    price: "from £40/seat/year",
    detail: "Minimum 2 seats. Direct rollout, direct billing, and support.",
    primaryHref: "/pricing/direct",
    primaryLabel: "View Team pricing",
    secondaryHref: "/contact",
    secondaryLabel: "Talk to us"
  },
  enterprise: {
    eyebrow: "Enterprise",
    title: "Bring procurement with you.",
    summary: "Deployment, invoicing, packaging, and rollout support.",
    price: "custom",
    detail: "For serious cat business.",
    primaryHref: "/contact",
    primaryLabel: "Contact sales"
  }
} as const;

export function HomeExperience() {
  const [mode, setMode] = useState<Mode>("business");
  const [personalPath, setPersonalPath] = useState<PersonalPath>("direct");
  const [businessPath, setBusinessPath] = useState<BusinessPath>("team");
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

      // Crossfade images based on drag progress (0 = personal, 1 = business)
      const bizFactor = clamped / trackWidth;

      // Hero cat images
      if (personalImgRef.current && businessImgRef.current) {
        personalImgRef.current.style.transition = "none";
        businessImgRef.current.style.transition = "none";
        personalImgRef.current.style.opacity = `${1 - bizFactor}`;
        personalImgRef.current.style.transform = `scale(${0.98 + 0.02 * (1 - bizFactor)})`;
        businessImgRef.current.style.opacity = `${bizFactor}`;
        businessImgRef.current.style.transform = `scale(${0.98 + 0.02 * bizFactor})`;
      }

      // Menu bar brand icon — same crossfade as hero
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

      // Reset all inline styles so CSS classes take over
      [personalImgRef.current, businessImgRef.current].forEach((el) => {
        if (el) {
          el.style.transition = "";
          el.style.opacity = "";
          el.style.transform = "";
        }
      });
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
    ["/assets/cat-personal.png", "/assets/cat-business.png", "/assets/cat.gif"].forEach(
      (src) => {
        const img = new window.Image();
        img.src = src;
      }
    );
  }, []);

  useEffect(() => {
    document.body.dataset.homeMode = mode;

    // Update favicon to match mode
    const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (favicon) {
      favicon.href = mode === "business" ? "/assets/cat-business.png" : "/assets/cat-personal.png";
    }

    return () => {
      delete document.body.dataset.homeMode;
    };
  }, [mode]);

  useEffect(() => {
    const node = detailsRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDetailsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const activePersonalPanel = personalPanels[personalPath];
  const activeBusinessPanel = businessPanels[businessPath];

  return (
    <div className={`homeMode homeMode${mode === "personal" ? "Personal" : "Business"}`}>
      <section className="homeHero homeHeroCompact">
        {/* Floating cat GIF is 5.1MB - should be converted to WebP for better performance */}
        {mode === "personal" ? (
          <div aria-hidden="true" className="floatingCats">
            <Image alt="" className="floatingCat floatingCatOne" src="/assets/cat.gif" width={60} height={60} unoptimized />
            <Image alt="" className="floatingCat floatingCatTwo" src="/assets/cat.gif" width={64} height={64} unoptimized />
            <Image alt="" className="floatingCat floatingCatThree" src="/assets/cat.gif" width={52} height={52} unoptimized />
            <Image alt="" className="floatingCat floatingCatFour" src="/assets/cat.gif" width={58} height={58} unoptimized />
          </div>
        ) : null}

        <div className="heroMinimalFrame heroMinimalFrameCompact">
          <div className="heroImageFrame heroImageFrameCompact">
            <span
              className={`heroCatImage heroCatImagePersonal ${
                mode === "personal" ? "isVisible" : ""
              }`}
              ref={personalImgRef}
            >
              <Image
                alt="Local AI Cat personal mark"
                src="/assets/cat-personal.png"
                fill
                sizes="(max-width: 760px) 100vw, 720px"
                priority
              />
            </span>
            <span
              className={`heroCatImage heroCatImageBusiness ${
                mode === "business" ? "isVisible" : ""
              }`}
              ref={businessImgRef}
            >
              <Image
                alt="Local AI Cat business mark"
                src="/assets/cat-business.png"
                fill
                sizes="(max-width: 760px) 100vw, 720px"
                priority
              />
            </span>
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

            <a
              aria-label="Jump to the next section"
              className="heroJumpIcon"
              href="#download-paths"
            >
              <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path
                  d="M12 5v14M6 13l6 6 6-6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <section
        className={`detailBand detailBandMinimal sectionReveal ${detailsVisible ? "isVisible" : ""}`}
        id="download-paths"
        ref={detailsRef}
      >
        <div className="sectionHeading sectionHeadingNarrow sectionHeadingCentered">
          <p className="sectionEyebrow">
            {mode === "personal" ? "Choose your install." : "Choose your path."}
          </p>
          <h2>{mode === "personal" ? "Free to start." : "Two business lanes."}</h2>
          <p className="detailIntro">
            {mode === "personal"
              ? "Both paths include the free base experience. Paid plans unlock early access and additional features."
              : "Team is the self-serve path. Enterprise is the sales-led path."}
          </p>
        </div>

        {mode === "personal" ? (
          <div className="selectionFlow">
            <div
              aria-label="Install path"
              className="pathSwitch pathSwitchWide pathSwitchCentered sectionChildReveal"
              role="tablist"
            >
              <button
                aria-selected={personalPath === "direct"}
                className={personalPath === "direct" ? "isActive" : undefined}
                onClick={() => setPersonalPath("direct")}
                role="tab"
                type="button"
              >
                Get the full experience
              </button>
              <button
                aria-selected={personalPath === "app-store"}
                className={personalPath === "app-store" ? "isActive" : undefined}
                onClick={() => setPersonalPath("app-store")}
                role="tab"
                type="button"
              >
                Stay in the sandbox
              </button>
            </div>

            <article className="revealPanel sectionChildReveal" key={personalPath}>
              <p className="routeEyebrow">{activePersonalPanel.eyebrow}</p>
              <div className="revealPanelHeader">
                <h3>{activePersonalPanel.title}</h3>
                <p className="revealPanelPrice">{activePersonalPanel.price}</p>
              </div>
              <p className="revealPanelSummary">{activePersonalPanel.summary}</p>
              <p className="revealPanelDetail">{activePersonalPanel.detail}</p>
              <div className="routeActions">
                <Link className="planButton" href={activePersonalPanel.primaryHref}>
                  {activePersonalPanel.primaryLabel}
                </Link>
                <Link className="secondaryButton" href={activePersonalPanel.secondaryHref}>
                  {activePersonalPanel.secondaryLabel}
                </Link>
              </div>
            </article>

            <div className="compareTable sectionChildReveal">
              <div className="compareHeader">Compare</div>
              <div className="compareHeader">Direct download</div>
              <div className="compareHeader">App Store</div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Base experience</div>
                <div className="compareCell">Free</div>
                <div className="compareCell">Free</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Paid upgrades</div>
                <div className="compareCell">Early access and additional features via Pro + Developer Mode</div>
                <div className="compareCell">Early access and additional features via Pro + Developer Mode</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Mac experience</div>
                <div className="compareCell">Full feature set</div>
                <div className="compareCell">Simpler sandboxed path</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Best for</div>
                <div className="compareCell">Power users, direct billing, fuller Mac access</div>
                <div className="compareCell">Easiest install, iPhone, and iPad</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Business route</div>
                <div className="compareCell">Team and Enterprise live here</div>
                <div className="compareCell">Not the business path</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="selectionFlow">
            <div
              aria-label="Business path"
              className="pathSwitch pathSwitchWide pathSwitchCentered sectionChildReveal"
              role="tablist"
            >
              <button
                aria-selected={businessPath === "team"}
                className={businessPath === "team" ? "isActive" : undefined}
                onClick={() => setBusinessPath("team")}
                role="tab"
                type="button"
              >
                Team
              </button>
              <button
                aria-selected={businessPath === "enterprise"}
                className={businessPath === "enterprise" ? "isActive" : undefined}
                onClick={() => setBusinessPath("enterprise")}
                role="tab"
                type="button"
              >
                Enterprise
              </button>
            </div>

            <article className="revealPanel sectionChildReveal" key={businessPath}>
              <p className="routeEyebrow">{activeBusinessPanel.eyebrow}</p>
              <div className="revealPanelHeader">
                <h3>{activeBusinessPanel.title}</h3>
                <p className="revealPanelPrice">{activeBusinessPanel.price}</p>
              </div>
              <p className="revealPanelSummary">{activeBusinessPanel.summary}</p>
              <p className="revealPanelDetail">{activeBusinessPanel.detail}</p>
              <div className="routeActions">
                <Link className="planButton" href={activeBusinessPanel.primaryHref}>
                  {activeBusinessPanel.primaryLabel}
                </Link>
                {"secondaryHref" in activeBusinessPanel && activeBusinessPanel.secondaryHref ? (
                  <Link className="secondaryButton" href={activeBusinessPanel.secondaryHref}>
                    {activeBusinessPanel.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </article>

            <div className="compareTable sectionChildReveal">
              <div className="compareHeader">Compare</div>
              <div className="compareHeader">Team</div>
              <div className="compareHeader">Enterprise</div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Minimum</div>
                <div className="compareCell">2 seats</div>
                <div className="compareCell">Custom</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Billing</div>
                <div className="compareCell">Self-serve direct billing</div>
                <div className="compareCell">Sales-led invoicing and procurement</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Deployment</div>
                <div className="compareCell">Direct app rollout</div>
                <div className="compareCell">Packaging, rollout, and managed support</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Best for</div>
                <div className="compareCell">Small teams</div>
                <div className="compareCell">Procurement-heavy organizations</div>
              </div>

              <div className="compareRow">
                <div className="compareCell compareLabel">Support</div>
                <div className="compareCell">Standard support</div>
                <div className="compareCell">Custom onboarding and support scope</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
