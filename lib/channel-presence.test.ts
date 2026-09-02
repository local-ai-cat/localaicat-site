import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  presenceIn,
  presenceOf,
  publishedChannelOrder,
  publishedFacetValues,
  publishedPlatforms,
  type ChannelSnapshot
} from "./channel-presence.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const grid = (iOS: "yes" | "no" | "partial" | "planned", macOS: "yes" | "no" | "partial" | "planned") =>
  ({ name: "x", status: "live", lane: "stable", iOS, macOS });

test("presenceOf: any yes ships, partial/planned is partial, all-no is no, missing is absent", () => {
  assert.equal(presenceOf(grid("no", "yes")), "yes");
  assert.equal(presenceOf(grid("partial", "no")), "partial");
  assert.equal(presenceOf(grid("planned", "no")), "partial");
  assert.equal(presenceOf(grid("no", "no")), "no");
  assert.equal(presenceOf(undefined), "absent");
});

test("publishedPlatforms lists shipping platforms with their qualifier", () => {
  assert.deepEqual(publishedPlatforms(grid("partial", "yes")), ["iOS (partial)", "macOS"]);
  assert.deepEqual(publishedPlatforms(grid("no", "no")), []);
});

test("publishedFacetValues: shipping channels, or 'none' for a feature row that ships nowhere", () => {
  assert.deepEqual(publishedFacetValues({ outdoor: "yes", beta: "partial", alpha: "no" }, true), ["outdoor", "beta"]);
  assert.deepEqual(publishedFacetValues({ outdoor: "absent", beta: "no", alpha: "no" }, true), ["none"]);
  assert.deepEqual(publishedFacetValues({ outdoor: "absent", beta: "absent", alpha: "absent" }, false), []);
});

test("the committed snapshot carries the three channels in display order, each with a real build", () => {
  const snapshot = JSON.parse(readFileSync(path.join(here, "../data/channel-manifests.json"), "utf8")) as ChannelSnapshot;
  assert.deepEqual(snapshot.channels.map((channel) => channel.key), publishedChannelOrder);
  assert.match(snapshot.synced, /^\d{4}-\d{2}-\d{2}$/);
  for (const channel of snapshot.channels) {
    assert.ok(Number.isInteger(channel.build) && channel.build > 0, `${channel.key} build`);
    assert.match(channel.tag, /^(released|release|beta|alpha)\/v/);
    assert.ok(channel.manifest.featureCount >= channel.manifest.shippingCount, `${channel.key} counts`);
    assert.ok(Object.keys(channel.features).length === channel.manifest.featureCount, `${channel.key} feature map`);
  }
  // A feature nobody has heard of is absent everywhere — the filter must not invent it.
  assert.deepEqual(presenceIn(snapshot, "no-such-feature"), { outdoor: "absent", beta: "absent", alpha: "absent" });
  // Chat has shipped in every build since the first manifest.
  assert.equal(presenceIn(snapshot, "chat-local-llm").outdoor, "yes");
});
