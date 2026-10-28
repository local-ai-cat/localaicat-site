import assert from "node:assert/strict";
import test from "node:test";
import { appcastItemForChannel, appcastItems } from "./direct-download-release.ts";

// The live feed's shape on 2026-10-28: the merged beta item comes before the stable one.
const FEED = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0">
  <channel>
    <item>
      <title>Version 1.4.0-b17</title>
      <sparkle:channel>beta</sparkle:channel>
      <sparkle:version>479</sparkle:version>
      <sparkle:shortVersionString>1.4.0-b17</sparkle:shortVersionString>
      <pubDate>Fri, 09 Oct 2026 11:51:36 +0000</pubDate>
      <enclosure url="https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-b17/LocalAIChatDirect-1.4.0-b17.dmg" length="1" type="application/octet-stream" />
    </item>
    <item>
      <title>Version 1.4.0</title>
      <sparkle:version>480</sparkle:version>
      <sparkle:shortVersionString>1.4.0</sparkle:shortVersionString>
      <pubDate>Fri, 09 Oct 2026 12:00:00 +0000</pubDate>
      <enclosure url="https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-480/LocalAIChatDirect-1.4.0.dmg" length="1" type="application/octet-stream" />
    </item>
  </channel>
</rss>`;

test("the stable item is the one without a channel, even when a beta comes first", () => {
  assert.deepEqual(appcastItemForChannel(FEED, null), {
    channel: null,
    build: "480",
    version: "1.4.0",
    publishedAt: "2026-10-09",
    downloadUrl: "https://github.com/local-ai-cat/localaicat-site/releases/download/v1.4.0-480/LocalAIChatDirect-1.4.0.dmg"
  });
});

test("the beta item carries its own version and DMG", () => {
  const beta = appcastItemForChannel(FEED, "beta");
  assert.equal(beta?.version, "1.4.0-b17");
  assert.equal(beta?.downloadUrl?.endsWith("/LocalAIChatDirect-1.4.0-b17.dmg"), true);
});

test("a feed without items, or without the asked channel, has nothing to offer", () => {
  assert.deepEqual(appcastItems("<rss></rss>"), []);
  assert.equal(appcastItemForChannel(FEED, "alpha"), null);
});
