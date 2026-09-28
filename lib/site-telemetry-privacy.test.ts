import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { goatCounterEventUrl, goatCounterPixelUrl, sanitizeSpeedEvent } from "./site-telemetry-privacy.ts";
import { supportChatUrl } from "./support-chat.ts";

test("GoatCounter receives only public paths and a cache buster, never bearer or referrer data", () => {
  const url = new URL(goatCounterPixelUrl("https://localaicat.com/?cat=private&checkout_id=secret#token", true, 123)!);
  assert.equal(url.origin, "https://localaicat.goatcounter.com");
  assert.deepEqual([...url.searchParams], [["p", "/"], ["rnd", "123"]]);
  for (const path of ["/success", "/success/", "/activate", "/manage", "/api/checkout/secret", "/cat/private"]) {
    assert.equal(goatCounterPixelUrl(`https://localaicat.com${path}?t=secret`, true, 123), null);
  }
  for (const host of ["localhost", "meow.localaicat.com", "preview.vercel.app"]) {
    assert.equal(goatCounterPixelUrl(`https://${host}/`, true, 123), null);
  }
  assert.equal(goatCounterPixelUrl("https://localaicat.com/", false, 123), null);
});

test("GoatCounter events send only the event name, on production hosts, when counting is on", () => {
  const url = new URL(goatCounterEventUrl("purrdain-src-card", "localaicat.com", true, 123)!);
  assert.equal(url.origin, "https://localaicat.goatcounter.com");
  assert.deepEqual([...url.searchParams], [["p", "purrdain-src-card"], ["e", "true"], ["rnd", "123"]]);
  assert.equal(goatCounterEventUrl("purrdain-src-card", "localaicat.com", false, 123), null);
  for (const host of ["localhost", "preview.vercel.app"]) {
    assert.equal(goatCounterEventUrl("purrdain-src-card", host, true, 123), null);
  }
});

test("Speed Insights strips every query, fragment and supplied private route", () => {
  assert.deepEqual(sanitizeSpeedEvent({ type: "vital", url: "https://localaicat.com/pricing?token=secret#cat", route: "/success/secret" }, true), {
    type: "vital", url: "https://localaicat.com/pricing", route: "/pricing"
  });
  for (const path of ["/success", "/activate", "/manage", "/api/checkouts", "/private/secret"]) {
    assert.equal(sanitizeSpeedEvent({ url: `https://localaicat.com${path}?token=secret` }, true), null);
  }
  assert.equal(sanitizeSpeedEvent({ url: "https://localaicat.com/" }, false), null);
  assert.equal(sanitizeSpeedEvent({ url: "invalid" }, true), null);
});

test("support uses only the public inbox URL in an isolated, click-created frame", () => {
  const link = new URL(supportChatUrl);
  assert.equal(link.origin, "https://app.chatwoot.com");
  assert.equal(link.pathname, "/widget");
  assert.deepEqual([...link.searchParams.keys()], ["website_token", "locale"]);
  const component = readFileSync(new URL("../app/_components/support-chat.tsx", import.meta.url), "utf8");
  assert.match(component, /started && <iframe/);
  assert.match(component, /sandbox="allow-scripts allow-same-origin allow-forms"/);
  assert.doesNotMatch(component, /next\/script|sdk\.js|document\.cookie|location\.href/);
  assert.match(component, /referrerPolicy="no-referrer"/);
  // Regression guard: an onload/reload check cannot undo a remote SDK execution.
  assert.equal(existsSync(new URL("../public/js/cookie-consent.js", import.meta.url)), false);
  assert.equal(existsSync(new URL("../app/_components/bearer-page-guard.tsx", import.meta.url)), false);
  assert.doesNotMatch(readFileSync(new URL("../app/goat-counter.tsx", import.meta.url), "utf8"), /next\/script|gc\.zgo\.at|count\.js["']/);
});
