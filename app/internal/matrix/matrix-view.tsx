"use client";

import { useMemo, useState } from "react";
import features from "../data/features.json";
import styles from "./matrix.module.css";

type Tri = "yes" | "no" | "partial" | "planned";
type Channel = "alpha" | "beta" | "outdoor" | "main";
type Lane = "stable" | "beta" | "alpha" | "locked" | "purgatory";
type Grade = "gold" | "strong" | "partial" | "weak";

interface PlatformCapacity {
  iOS: Tri;
  macOS: Tri;
}
type Grid = Record<Channel, PlatformCapacity>;
interface BuildCaveat {
  scope: Channel;
  note: string;
}
interface Feature {
  id: string;
  name: string;
  status: string;
  lane: Lane;
  stagedForPromotion?: boolean;
  builds: Grid;
  target?: Grid;
  platforms: { iOS: Tri; macOS: Tri };
  group?: string;
  package: string;
  modular: "yes" | "partial" | "no";
  permissions: string[];
  caveats?: BuildCaveat[];
  goldStandard?: { grade: Grade; gap: string };
  notes?: string;
  isInternal?: boolean;
}

const ALL: Feature[] = (features as { features: Feature[] }).features;

const CHANNELS: { key: Channel; label: string; sub: string }[] = [
  { key: "alpha", label: "Alpha", sub: "internal overlay" },
  { key: "beta", label: "Beta", sub: "Sparkle prerelease" },
  { key: "outdoor", label: "Outdoor", sub: "Direct download" },
  { key: "main", label: "Main", sub: "App Store" },
];
const LANES: { key: Lane; label: string }[] = [
  { key: "locked", label: "Locked" },
  { key: "stable", label: "Stable" },
  { key: "beta", label: "Beta" },
  { key: "alpha", label: "Alpha" },
  { key: "purgatory", label: "Purgatory" },
];
const AVAIL_WORD: Record<Tri, string> = { yes: "ships", partial: "partial", planned: "planned", no: "off" };
const GRADE_WORD: Record<Grade, string> = { gold: "Gold", strong: "Strong", partial: "Partial", weak: "Weak" };

function runs(t: Tri) {
  return t === "yes" || t === "partial";
}
function ships(c: PlatformCapacity) {
  return runs(c.iOS) || runs(c.macOS);
}

function Dot({ v }: { v: Tri }) {
  return <span className={`${styles.dot} ${styles[`dot_${v}`]}`} />;
}

function PlatLine({ icon, v, t }: { icon: string; v: Tri; t?: Tri }) {
  const arrow = t && t !== v ? t : null;
  return (
    <span className={`${styles.pl} ${v === "no" ? styles.plOff : ""}`}>
      <span className={styles.plIcon}>{icon}</span>
      <Dot v={v} />
      <span className={styles.plWord}>{AVAIL_WORD[v]}</span>
      {arrow && <em className={styles.plArrow}>→ {AVAIL_WORD[arrow]}</em>}
    </span>
  );
}

function ChannelCell({ f, ch }: { f: Feature; ch: Channel }) {
  const cell = f.builds[ch];
  const t = f.target?.[ch];
  const showMac = runs(f.platforms.macOS);
  const showIOS = runs(f.platforms.iOS);
  const caveat = f.caveats?.find((c) => c.scope === ch)?.note;
  const dark = !ships(cell);
  return (
    <td className={`${styles.cell} ${dark ? styles.cellOff : ""}`}>
      {showMac && <PlatLine icon="mac" v={cell.macOS} t={t?.macOS} />}
      {showIOS && <PlatLine icon="iOS" v={cell.iOS} t={t?.iOS} />}
      {!showMac && !showIOS && <span className={styles.plOffOnly}>—</span>}
      {caveat && <span className={styles.caveat}>{caveat}</span>}
    </td>
  );
}

function Row({ f }: { f: Feature }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={`${styles.row} ${styles[`lane_${f.lane}`]}`}>
        <td className={styles.featCell}>
          <div className={styles.featHead}>
            <span className={styles.featName}>{f.name}</span>
            <span className={styles.plats}>
              {runs(f.platforms.macOS) && <span>mac</span>}
              {runs(f.platforms.iOS) && <span>iOS</span>}
            </span>
          </div>
          <div className={styles.tags}>
            <span className={`${styles.laneTag} ${styles[`lane_${f.lane}`]}`}>{f.lane}</span>
            <span className={styles.statusTag}>{f.status}</span>
            {f.group === "utilities" && <span className={styles.groupTag}>utilities</span>}
            {f.stagedForPromotion && <span className={styles.stagedTag}>next release</span>}
            {f.isInternal && <span className={styles.intTag}>internal</span>}
          </div>
          {f.permissions.filter((p) => p !== "none").length > 0 && (
            <div className={styles.perms}>
              {f.permissions
                .filter((p) => p !== "none")
                .map((p) => (
                  <span key={p} className={styles.perm}>
                    {p}
                  </span>
                ))}
            </div>
          )}
          <div className={styles.pkg}>{f.package}</div>
          {f.notes && (
            <button className={styles.detBtn} onClick={() => setOpen((v) => !v)}>
              {open ? "− hide details" : "+ details"}
            </button>
          )}
        </td>
        {CHANNELS.map((c) => (
          <ChannelCell key={c.key} f={f} ch={c.key} />
        ))}
        <td className={styles.modCell}>
          <span className={`${styles.modTag} ${styles[`mod_${f.modular}`]}`}>{f.modular}</span>
        </td>
        <td className={styles.goldCell}>
          {f.goldStandard ? (
            <>
              <span className={`${styles.grade} ${styles[`grade_${f.goldStandard.grade}`]}`}>
                {GRADE_WORD[f.goldStandard.grade]}
              </span>
              {f.goldStandard.grade !== "gold" && f.goldStandard.gap && (
                <span className={styles.gap}>{f.goldStandard.gap}</span>
              )}
            </>
          ) : (
            <span className={styles.plOffOnly}>—</span>
          )}
        </td>
      </tr>
      {open && f.notes && (
        <tr className={styles.detRow}>
          <td colSpan={7}>{f.notes}</td>
        </tr>
      )}
    </>
  );
}

export function MatrixView() {
  const [q, setQ] = useState("");
  const [lanes, setLanes] = useState<Set<Lane>>(new Set(LANES.map((l) => l.key)));
  const [platform, setPlatform] = useState<"all" | "macOS" | "iOS">("all");
  const [channel, setChannel] = useState<Channel | "any">("any");
  const [utilOnly, setUtilOnly] = useState(false);
  const [showInternal, setShowInternal] = useState(true);
  const [wide, setWide] = useState(true);

  const toggleLane = (l: Lane) =>
    setLanes((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const filtered = useMemo(
    () =>
      ALL.filter((f) => {
        if (!showInternal && f.isInternal) return false;
        if (utilOnly && f.group !== "utilities") return false;
        if (!lanes.has(f.lane)) return false;
        if (platform === "macOS" && !runs(f.platforms.macOS)) return false;
        if (platform === "iOS" && !runs(f.platforms.iOS)) return false;
        if (channel !== "any" && !ships(f.builds[channel])) return false;
        if (q.trim()) {
          const s = q.toLowerCase();
          if (!f.name.toLowerCase().includes(s) && !f.id.includes(s) && !f.package.toLowerCase().includes(s))
            return false;
        }
        return true;
      }).sort((a, b) => LANES.findIndex((l) => l.key === a.lane) - LANES.findIndex((l) => l.key === b.lane)),
    [q, lanes, platform, channel, utilOnly, showInternal],
  );

  return (
    <div className={`${styles.wrap} ${wide ? styles.wide : ""}`}>
      <div className={styles.controls}>
        <div className={styles.controlsTop}>
          <input
            className={styles.search}
            placeholder="Search features, packages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className={styles.count}>
            {filtered.length} <span>/ {ALL.length}</span>
          </span>
        </div>
        <div className={styles.segRow}>
          <div className={styles.seg}>
            {LANES.map((l) => (
              <button
                key={l.key}
                className={`${lanes.has(l.key) ? styles.on : ""} ${styles[`segLane_${l.key}`]}`}
                onClick={() => toggleLane(l.key)}
              >
                {l.label}
                <em>{ALL.filter((f) => f.lane === l.key).length}</em>
              </button>
            ))}
          </div>
          <div className={styles.seg}>
            {(["all", "macOS", "iOS"] as const).map((p) => (
              <button key={p} className={platform === p ? styles.on : ""} onClick={() => setPlatform(p)}>
                {p === "all" ? "All platforms" : p}
              </button>
            ))}
          </div>
          <div className={styles.seg}>
            <button className={channel === "any" ? styles.on : ""} onClick={() => setChannel("any")}>
              Any channel
            </button>
            {CHANNELS.map((c) => (
              <button key={c.key} className={channel === c.key ? styles.on : ""} onClick={() => setChannel(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
          <button className={`${styles.pill} ${utilOnly ? styles.on : ""}`} onClick={() => setUtilOnly((v) => !v)}>
            Utilities only
          </button>
          <button className={`${styles.pill} ${showInternal ? styles.on : ""}`} onClick={() => setShowInternal((v) => !v)}>
            internal {showInternal ? "✓" : "✕"}
          </button>
          <button
            className={`${styles.pill} ${styles.wideBtn} ${wide ? styles.on : ""}`}
            onClick={() => setWide((v) => !v)}
            title={wide ? "Fit to content width" : "Expand to full width"}
          >
            {wide ? "⤢ Fit" : "⤢ Full width"}
          </button>
        </div>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thFeat}>Feature</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className={styles.thChan}>
                  <span className={styles.thChanL}>{c.label}</span>
                  <span className={styles.thChanS}>{c.sub}</span>
                </th>
              ))}
              <th className={styles.thMod}>Modular</th>
              <th className={styles.thGold}>Gold-standard</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <Row key={f.id} f={f} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  No features match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
