// Pure helpers over the published-build snapshot (data/channel-manifests.json).
// Kept free of the JSON import so they can be unit-tested under node:test;
// lib/channel-snapshot.ts binds them to the committed data.
import type { Availability } from "./module-catalog";

export type PublishedChannelKey = "outdoor" | "beta" | "alpha";
export type Presence = "yes" | "partial" | "no" | "absent";

export type PublishedFeature = {
  name: string;
  status: string;
  lane: string;
  iOS: Availability;
  macOS: Availability;
};

export type PublishedChannel = {
  key: PublishedChannelKey;
  label: string;
  sparkleChannel: string;
  version: string;
  build: number;
  publishedAt: string | null;
  downloadURL: string | null;
  tag: string;
  commit: string;
  commitDate: string;
  trunkCommitsSince: number;
  manifest: {
    schemaVersion: number | null;
    updated: string | null;
    featureCount: number;
    shippingCount: number;
  };
  features: Record<string, PublishedFeature>;
};

export type ChannelSnapshot = {
  schemaVersion: number;
  synced: string;
  appcast: string;
  trunk: { ref: string; commit: string; date: string };
  channels: PublishedChannel[];
};

export type PublishedPresence = Record<PublishedChannelKey, Presence>;

export const publishedChannelOrder: PublishedChannelKey[] = ["outdoor", "beta", "alpha"];

export const presenceGlyphs: Record<Presence, string> = {
  yes: "●",
  partial: "◐",
  no: "○",
  absent: "–"
};

export const presenceLabels: Record<Presence, string> = {
  yes: "shipping",
  partial: "partially shipping",
  no: "not in this build",
  absent: "did not exist yet"
};

// A feature is "shipping" in a build when any platform is more than "no".
// `absent` is different from `no`: the feature had not been catalogued when
// that build was cut, which is the honest answer for much of the stable build.
export function presenceOf(feature: PublishedFeature | undefined): Presence {
  if (!feature) return "absent";
  const values = [feature.iOS, feature.macOS];
  if (values.includes("yes")) return "yes";
  if (values.some((value) => value === "partial" || value === "planned")) return "partial";
  return "no";
}

export function publishedPlatforms(feature: PublishedFeature): string[] {
  return (["iOS", "macOS"] as const).flatMap((platform) => {
    const availability = feature[platform];
    if (availability === "no") return [];
    return [availability === "yes" ? platform : `${platform} (${availability})`];
  });
}

export function presenceIn(snapshot: ChannelSnapshot, featureId: string): PublishedPresence {
  const out = {} as PublishedPresence;
  for (const key of publishedChannelOrder) {
    const channel = snapshot.channels.find((candidate) => candidate.key === key);
    if (!channel) throw new Error(`channel snapshot has no ${JSON.stringify(key)} channel — run npm run sync:channels`);
    out[key] = presenceOf(channel.features[featureId]);
  }
  return out;
}

export function absentPresence(): PublishedPresence {
  return { outdoor: "absent", beta: "absent", alpha: "absent" };
}

// The facet values a row contributes to the "Published in" filter.
export function publishedFacetValues(presence: PublishedPresence, isFeature: boolean): string[] {
  const values = publishedChannelOrder.filter((key) => presence[key] === "yes" || presence[key] === "partial");
  if (values.length === 0 && isFeature) return ["none"];
  return values;
}
