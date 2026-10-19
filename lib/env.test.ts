import assert from "node:assert/strict";
import test from "node:test";
import {
  getCheckoutUrl,
  getPolarAdminKey,
  getPolarApiBaseUrl
} from "./env.ts";

const originalEnv = {
  POLAR_ADMIN_KEY: process.env.POLAR_ADMIN_KEY,
  POLAR_API_BASE_URL: process.env.POLAR_API_BASE_URL,
  POLAR_CHECKOUT_URL_PRO_MONTHLY: process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY,
  POLAR_CHECKOUT_URL_DEVELOPER_MODE: process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE
};

test.afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("environment helpers strip accidental escaped newlines", () => {
  process.env.POLAR_ADMIN_KEY = "polar_oat_prod\\n";
  process.env.POLAR_API_BASE_URL = "https://api.polar.sh\\n";
  process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY = "https://polar.sh/checkout/test\\n";

  assert.equal(getPolarAdminKey(), "polar_oat_prod");
  assert.equal(getPolarApiBaseUrl(), "https://api.polar.sh");
  assert.equal(getCheckoutUrl("pro-monthly"), "https://polar.sh/checkout/test");
});

test("polar API base strips trailing slashes", () => {
  process.env.POLAR_API_BASE_URL = "https://api.polar.sh/";

  assert.equal(getPolarApiBaseUrl(), "https://api.polar.sh");
});

test("Developer Mode accepts the configured live or sandbox Polar checkout", () => {
  for (const url of [
    "https://buy.polar.sh/polar_cl_developer",
    "https://api.polar.sh/v1/checkout-links/polar_cl_developer/redirect",
    "https://sandbox.polar.sh/checkout/test",
    "https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_developer/redirect"
  ]) {
    process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE = url;
    assert.equal(getCheckoutUrl("developer-mode"), url);
  }
});

test("unsafe or malformed configured checkouts are unavailable", () => {
  for (const url of [
    "https://phishing.example/checkout",
    "https://buy.polar.sh.evil.example/checkout",
    "http://buy.polar.sh/checkout",
    "https://user:secret@buy.polar.sh/checkout",
    "https://buy.polar.sh:8443/checkout",
    "javascript:alert(1)",
    "/contact",
    ""
  ]) {
    process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE = url;
    assert.equal(getCheckoutUrl("developer-mode"), null);
  }
});
