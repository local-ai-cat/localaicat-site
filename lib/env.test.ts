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
  POLAR_CHECKOUT_URL_PRO_MONTHLY: process.env.POLAR_CHECKOUT_URL_PRO_MONTHLY
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
