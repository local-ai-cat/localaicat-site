"use client";

import { useMemo, useState } from "react";

type Availability = "yes" | "no" | "partial" | "planned";

export interface PublicFeature {
  id: string;
  name: string;
  group: string | null;
  platforms: string[];
  tiers: string[];
  permissions: string[];
  description: string | null;
  channels: { key: string; label: string; iOS: Availability; macOS: Availability }[];
  caveats: { channel: string; note: string }[];
  package: string | null;
  modular: "yes" | "partial" | "no";
  goldStandard: { grade: "gold" | "strong" | "partial" | "weak"; gap: string } | null;
}

const availabilityWord: Record<Availability, string> = {
  yes: "Ships",
  partial: "Partial",
  planned: "Planned",
  no: "—"
};
const modularWord = { yes: "Fully packaged", partial: "Partially packaged", no: "In the app shell" } as const;
const gradeWord = { gold: "Gold", strong: "Strong", partial: "Partial", weak: "Weak" } as const;

function ChannelGrid({ feature }: { feature: PublicFeature }) {
  const showMac = feature.platforms.includes("macOS");
  const showIOS = feature.platforms.includes("iOS");
  return (
    <table className="fcChannelTable">
      <thead>
        <tr>
          <th scope="col">Channel</th>
          {showMac && <th scope="col">macOS</th>}
          {showIOS && <th scope="col">iOS</th>}
        </tr>
      </thead>
      <tbody>
        {feature.channels.map((channel) => (
          <tr key={channel.key}>
            <th scope="row">{channel.label}</th>
            {showMac && (
              <td data-avail={channel.macOS}>{availabilityWord[channel.macOS]}</td>
            )}
            {showIOS && (
              <td data-avail={channel.iOS}>{availabilityWord[channel.iOS]}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeatureRow({ feature, open, onToggle }: {
  feature: PublicFeature;
  open: boolean;
  onToggle: () => void;
}) {
  const detailId = `feature-detail-${feature.id}`;
  return (
    <article className="fcItem">
      <button
        type="button"
        className="fcHead"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggle}
      >
        <span className="fcName">{feature.name}</span>
        <span className="fcChips">
          {feature.platforms.map((platform) => (
            <span className="fcChip" key={platform}>{platform}</span>
          ))}
          {feature.tiers.map((tier) => (
            <span className="fcChip fcChipTier" key={tier}>{tier}</span>
          ))}
          {feature.group === "utilities" && <span className="fcChip fcChipGroup">Utility</span>}
        </span>
        <span aria-hidden="true" className="fcCaret">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="fcBody" id={detailId}>
          {feature.description && <p className="fcDescription">{feature.description}</p>}
          <div className="fcDetailGrid">
            <div>
              <h3 className="fcDetailLabel">Availability</h3>
              <ChannelGrid feature={feature} />
            </div>
            <div>
              <h3 className="fcDetailLabel">Permissions</h3>
              <p className="fcDetailText">{feature.permissions.join(", ")}</p>
              {feature.caveats.length > 0 && (
                <>
                  <h3 className="fcDetailLabel">Per-build notes</h3>
                  <ul className="fcCaveats">
                    {feature.caveats.map((caveat) => (
                      <li key={`${caveat.channel}-${caveat.note}`}>
                        <strong>{caveat.channel}:</strong> {caveat.note}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h3 className="fcDetailLabel">Architecture</h3>
              <p className="fcDetailText">
                {modularWord[feature.modular]}
                {feature.goldStandard && <> · {gradeWord[feature.goldStandard.grade]} alignment</>}
              </p>
              {feature.package && <p className="fcPackage">{feature.package}</p>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function FeatureList({ features }: { features: PublicFeature[] }) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return features;
    return features.filter((feature) =>
      feature.name.toLowerCase().includes(needle) ||
      (feature.description ?? "").toLowerCase().includes(needle) ||
      feature.permissions.some((permission) => permission.toLowerCase().includes(needle))
    );
  }, [features, query]);

  const allOpen = filtered.length > 0 && filtered.every((feature) => openIds.has(feature.id));

  function toggle(id: string) {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setOpenIds(allOpen ? new Set() : new Set(filtered.map((feature) => feature.id)));
  }

  return (
    <div>
      <div className="fcControls">
        <input
          type="search"
          className="fcSearch"
          placeholder="Search features, permissions…"
          aria-label="Search features"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="fcCount">{filtered.length} of {features.length}</span>
        <button type="button" className="fcToggleAll" onClick={toggleAll}>
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="fcList">
        {filtered.map((feature) => (
          <FeatureRow
            feature={feature}
            key={feature.id}
            onToggle={() => toggle(feature.id)}
            open={openIds.has(feature.id)}
          />
        ))}
        {filtered.length === 0 && <p className="fcEmpty">No features match this search.</p>}
      </div>
    </div>
  );
}
