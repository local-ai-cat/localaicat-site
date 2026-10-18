import assert from "node:assert/strict";
import test from "node:test";
import { isBearerPath, withoutQuery } from "./bearer-urls.ts";

test("isBearerPath matches the pages that carry checkout ids and activation tokens", () => {
  assert.equal(isBearerPath("/success"), true);
  assert.equal(isBearerPath("/success/"), true);
  assert.equal(isBearerPath("/activate"), true);
  assert.equal(isBearerPath("/"), false);
  assert.equal(isBearerPath("/successful"), false);
  assert.equal(isBearerPath("/docs/activate"), false);
});

test("withoutQuery drops the query string and fragment", () => {
  assert.equal(withoutQuery("https://localaicat.com/success?checkout_id=abc"), "https://localaicat.com/success");
  assert.equal(withoutQuery("https://localaicat.com/activate?t=x#y"), "https://localaicat.com/activate");
  assert.equal(withoutQuery("https://localaicat.com/pricing"), "https://localaicat.com/pricing");
  assert.equal(withoutQuery(""), "");
});
