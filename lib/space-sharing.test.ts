import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeShareCopy, spaceShareImage, spaceShareVideo, spaceSharingMetadata } from "./space-sharing.ts";

test("preview sharing uses its own host even when the site URL is production", () => {
  const metadata = spaceSharingMetadata("https://localaicat.com", "space-review.vercel.app", homeShareCopy);
  const graph = metadata.openGraph as { url: string; images: {url: string}[] };
  const twitter = metadata.twitter as {images: {url: string}[]};
  assert.equal(graph.url, "https://space-review.vercel.app/");
  assert.equal(graph.images[0].url, `https://space-review.vercel.app${spaceShareImage}`);
  assert.equal(twitter.images[0].url, graph.images[0].url);
});

test("Messages gets a direct MP4 on the same host as the still fallback", () => {
  for (const previewHost of [undefined, "space-review.vercel.app"]) {
    const metadata = spaceSharingMetadata("https://localaicat.com", previewHost);
    const graph = metadata.openGraph as {
      images: {url: string}[];
      videos: {url: string; type: string; width: number; height: number}[];
    };
    const origin = previewHost ? `https://${previewHost}` : "https://localaicat.com";
    assert.deepEqual(graph.videos, [{
      url: `${origin}${spaceShareVideo}`,
      type: "video/mp4",
      width: 1200,
      height: 630
    }]);
    assert.equal(new URL(graph.images[0].url).origin, origin);
  }
});

test("sharing media is a real MP4 and fits the Messages associated-resource budget", () => {
  const video = readFileSync(new URL(`../public${spaceShareVideo}`, import.meta.url));
  const image = readFileSync(new URL(`../public${spaceShareImage}`, import.meta.url));
  assert.equal(video.subarray(4, 8).toString(), "ftyp");
  assert.ok(video.length + image.length < 10_000_000);
});

test("production sharing uses the configured site and a real 1200 by 630 PNG", () => {
  const metadata = spaceSharingMetadata("https://localaicat.com");
  assert.equal(new URL(String(metadata.metadataBase)).origin, "https://localaicat.com");
  const image = readFileSync(new URL(`../public${spaceShareImage}`, import.meta.url));
  assert.equal(image.subarray(1,4).toString(), "PNG");
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test("only the homepage fixes its card copy; every other page shares its own title, description and address", () => {
  const shared = spaceSharingMetadata("https://localaicat.com");
  const graph = shared.openGraph as Record<string, unknown>;
  const twitter = shared.twitter as Record<string, unknown>;
  for (const key of ["title", "description", "url"]) assert.equal(key in graph, false, key);
  for (const key of ["title", "description"]) assert.equal(key in twitter, false, key);
  const home = spaceSharingMetadata("https://localaicat.com", undefined, homeShareCopy);
  const homeGraph = home.openGraph as { title: string; url: string; images: unknown[] };
  assert.equal(homeGraph.title, homeShareCopy.title);
  assert.equal(homeGraph.url, "https://localaicat.com/");
  assert.equal(homeGraph.images.length, 1);
});
