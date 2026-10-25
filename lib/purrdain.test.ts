import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchPurrdainStock,
  PURRDAIN_DISCOUNT_ID,
  purrdainCheckoutUrl,
  purrdainSource,
  purrdainStockFromDiscount
} from "./purrdain.ts";

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

test("stock counts down from the limit and never goes below zero", () => {
  assert.deepEqual(purrdainStockFromDiscount({ max_redemptions: 500, redemptions_count: 63 }), {
    left: 437,
    total: 500
  });
  assert.deepEqual(purrdainStockFromDiscount({ max_redemptions: 500, redemptions_count: 501 }), {
    left: 0,
    total: 500
  });
  assert.equal(purrdainStockFromDiscount({ max_redemptions: null, redemptions_count: 3 }), null);
});

function fakeFetch(status: number, body: unknown, seen: string[] = []): typeof fetch {
  return (async (input: string | URL | Request) => {
    seen.push(String(input));
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

test("stock is read from the purrdain discount", async () => {
  const seen: string[] = [];
  const stock = await fetchPurrdainStock({
    adminKey: "key",
    apiBaseUrl: "https://api.polar.sh",
    fetchImpl: fakeFetch(200, { max_redemptions: 500, redemptions_count: 0 }, seen)
  });
  assert.deepEqual(stock, { left: 500, total: 500 });
  assert.deepEqual(seen, [`https://api.polar.sh/v1/discounts/${PURRDAIN_DISCOUNT_ID}`]);
});

test("no key, a missing scope or a dead network hides the count", async () => {
  const base = { apiBaseUrl: "https://api.polar.sh" };
  assert.equal(await fetchPurrdainStock({ ...base, adminKey: null, fetchImpl: fakeFetch(200, {}) }), null);
  assert.equal(
    await fetchPurrdainStock({
      ...base,
      adminKey: "key",
      fetchImpl: fakeFetch(403, { error: "insufficient_scope" })
    }),
    null
  );
  const offline = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  assert.equal(await fetchPurrdainStock({ ...base, adminKey: "key", fetchImpl: offline }), null);
});
