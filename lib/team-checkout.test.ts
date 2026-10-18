import assert from "node:assert/strict";
import test from "node:test";
import { successUrl, teamCheckoutBody, teamCheckoutMode, type TeamCheckoutConfig } from "./team-checkout.ts";

const PRODUCTION_TODAY: TeamCheckoutConfig = {
  adminKey: "polar_oat_test",
  teamProductId: null,
  proAnnualProductId: "prod_pro_annual",
  staticTeamUrl: "https://buy.polar.sh/polar_cl_team"
};
const SEAT_BILLING: TeamCheckoutConfig = { ...PRODUCTION_TODAY, teamProductId: "prod_team_seats" };
const SITE = "https://localaicat.com";

test("without a seat product the Team page sells one license, never seats", () => {
  assert.equal(teamCheckoutMode(PRODUCTION_TODAY), "single-license");
  const body = teamCheckoutBody("single-license", 7, PRODUCTION_TODAY, SITE);
  assert.deepEqual(body, { products: ["prod_pro_annual"], success_url: successUrl(SITE) });
  assert.ok(!("seats" in (body ?? {})), "a single-license checkout carries no seat count");
  assert.ok(!("metadata" in (body ?? {})), "no metadata claims seats the buyer is not getting");
});

test("a seat product sends the picked seat count and returns to the site", () => {
  assert.equal(teamCheckoutMode(SEAT_BILLING), "seats");
  assert.deepEqual(teamCheckoutBody("seats", 7, SEAT_BILLING, SITE), {
    products: ["prod_team_seats"],
    seats: 7,
    success_url: "https://localaicat.com/success?checkout_id={CHECKOUT_ID}"
  });
});

test("a static link alone still sells one license; nothing configured is unavailable", () => {
  const staticOnly = { adminKey: null, teamProductId: null, proAnnualProductId: null, staticTeamUrl: "https://buy.polar.sh/x" };
  assert.equal(teamCheckoutMode(staticOnly), "single-license");
  assert.equal(teamCheckoutBody("single-license", 3, staticOnly, SITE), null, "no admin key: no session, the route uses the link");
  assert.equal(teamCheckoutMode({ ...staticOnly, staticTeamUrl: null }), "unavailable");
});

test("a seat product without the admin key fails closed instead of selling one license", () => {
  assert.equal(teamCheckoutMode({ ...SEAT_BILLING, adminKey: null }), "unavailable");
});

test("successUrl tolerates a trailing slash on the site URL", () => {
  assert.equal(successUrl("https://meow.localaicat.com/"), "https://meow.localaicat.com/success?checkout_id={CHECKOUT_ID}");
});
