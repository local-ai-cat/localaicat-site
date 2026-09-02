import assert from "node:assert/strict";
import test from "node:test";
import {
  channelDefinitions,
  latestPerChannel,
  parseAppcast,
  projectManifest,
  tagCandidates
} from "./generate-channel-manifests.mjs";

const appcast = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <item>
      <title>1.4.0</title>
      <pubDate>Thu, 09 Jul 2026 12:07:00 +0100</pubDate>
      <sparkle:version>238</sparkle:version>
      <sparkle:shortVersionString>1.4.0</sparkle:shortVersionString>
      <enclosure url="https://example.test/LocalAIChatDirect-1.4.0.dmg" length="1" type="application/octet-stream" />
    </item>
    <item>
      <title>1.4.0-b4</title>
      <sparkle:channel>beta</sparkle:channel>
      <pubDate>Sun, 10 Aug 2026 04:16:00 +0100</pubDate>
      <sparkle:version>330</sparkle:version>
      <sparkle:shortVersionString>1.4.0-b4</sparkle:shortVersionString>
    </item>
    <item>
      <title>1.4.0-b5</title>
      <sparkle:channel>beta</sparkle:channel>
      <pubDate>Sun, 16 Aug 2026 04:16:00 +0100</pubDate>
      <sparkle:version>336</sparkle:version>
      <sparkle:shortVersionString>1.4.0-b5</sparkle:shortVersionString>
      <enclosure url="https://example.test/LocalAIChatDirect-1.4.0-b5.dmg" />
    </item>
    <item>
      <title>1.4.0-a158</title>
      <sparkle:channel>alpha</sparkle:channel>
      <pubDate>Wed, 02 Sep 2026 05:57:00 +0000</pubDate>
      <sparkle:version>391</sparkle:version>
      <sparkle:shortVersionString>1.4.0-a158</sparkle:shortVersionString>
    </item>
  </channel>
</rss>`;

test("parseAppcast reads every item and defaults a missing channel to stable", () => {
  const items = parseAppcast(appcast);
  assert.equal(items.length, 4);
  assert.deepEqual(items[0], {
    channel: "stable",
    version: "1.4.0",
    build: 238,
    publishedAt: "2026-07-09",
    downloadURL: "https://example.test/LocalAIChatDirect-1.4.0.dmg"
  });
  assert.equal(items[1].channel, "beta");
  assert.equal(items[1].downloadURL, null);
});

test("parseAppcast refuses an appcast with no items or a broken item", () => {
  assert.throws(() => parseAppcast("<rss></rss>"), /no <item> entries/);
  assert.throws(() => parseAppcast("<item><sparkle:version>x</sparkle:version></item>"), /missing sparkle:version/);
});

test("latestPerChannel keeps the highest build per channel — Sparkle's own rule", () => {
  const latest = latestPerChannel(parseAppcast(appcast));
  assert.equal(latest.get("stable").build, 238);
  assert.equal(latest.get("beta").build, 336);
  assert.equal(latest.get("beta").version, "1.4.0-b5");
  assert.equal(latest.get("alpha").build, 391);
});

test("tagCandidates follows the release scripts' bookkeeping tags, stable trying both prefixes", () => {
  const [outdoor, beta, alpha] = channelDefinitions;
  assert.deepEqual(tagCandidates(outdoor, { version: "1.4.0", build: 238 }), ["released/v1.4.0+238", "release/v1.4.0+238"]);
  // Prerelease display versions map to the TRAIN tag first (that is what the scripts push).
  assert.deepEqual(tagCandidates(beta, { version: "1.4.0-b5", build: 336 }), ["beta/v1.4.0+336", "beta/v1.4.0-b5+336"]);
  assert.deepEqual(tagCandidates(alpha, { version: "1.4.0-a158", build: 391 }), ["alpha/v1.4.0+391", "alpha/v1.4.0-a158+391"]);
});

function feature(id, overrides = {}) {
  const grid = { iOS: "yes", macOS: "yes" };
  return {
    id,
    name: id,
    status: "live",
    lane: "stable",
    builds: { alpha: grid, beta: grid, main: grid, outdoor: grid },
    ...overrides
  };
}

test("projectManifest reads an old-schema manifest, drops internal features, and counts what ships in that channel", () => {
  const manifest = {
    schemaVersion: 4,
    updated: "2026-07-09",
    features: [
      feature("chat"),
      feature("secret", { internal: true }),
      feature("workbench", {
        status: "wip",
        lane: "alpha",
        builds: {
          alpha: { iOS: "no", macOS: "yes" },
          beta: { iOS: "no", macOS: "no" },
          main: { iOS: "no", macOS: "no" },
          outdoor: { iOS: "no", macOS: "no" }
        }
      })
    ]
  };
  const outdoor = projectManifest(manifest, "outdoor");
  assert.deepEqual(outdoor.manifest, { schemaVersion: 4, updated: "2026-07-09", featureCount: 2, shippingCount: 1 });
  assert.deepEqual(Object.keys(outdoor.features), ["chat", "workbench"]);
  assert.deepEqual(outdoor.features.workbench, { name: "workbench", status: "wip", lane: "alpha", iOS: "no", macOS: "no" });

  const alpha = projectManifest(manifest, "alpha");
  assert.equal(alpha.manifest.shippingCount, 2);
  assert.equal(alpha.features.workbench.macOS, "yes");
});

test("projectManifest fails loudly on a grid it cannot read", () => {
  assert.throws(
    () => projectManifest({ features: [feature("x", { builds: { outdoor: { iOS: "maybe", macOS: "yes" } } })] }, "outdoor"),
    /unknown availability "maybe"/
  );
  assert.throws(() => projectManifest({ features: "nope" }, "outdoor"), /features must be an array/);
});
