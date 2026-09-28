import assert from "node:assert/strict";
import test from "node:test";
import { purrdainCheckoutUrl, purrdainSource } from "./purrdain.ts";

test("only known source tags pass through", () => {
  assert.equal(purrdainSource("card"), "card");
  assert.equal(purrdainSource(" Lockscreen "), "lockscreen");
  assert.equal(purrdainSource("<script>"), "other");
  assert.equal(purrdainSource(null), "other");
  assert.equal(purrdainSource(""), "other");
});

test("the checkout link carries the code and the source", () => {
  const url = new URL(
    purrdainCheckoutUrl("https://buy.polar.sh/polar_cl_example?locale=en", "card")
  );
  assert.equal(url.origin + url.pathname, "https://buy.polar.sh/polar_cl_example");
  assert.equal(url.searchParams.get("locale"), "en");
  assert.equal(url.searchParams.get("discount_code"), "PURRDAIN");
  assert.equal(url.searchParams.get("utm_campaign"), "purrdain");
  assert.equal(url.searchParams.get("utm_source"), "card");
});
