import test from "node:test";
import assert from "node:assert/strict";
import { directPlans } from "./catalog.ts";
import { minimumSystems, supportedDevicesAnswer } from "./product-facts.ts";
import { jsonLdScript, softwareApplicationJsonLd } from "./structured-data.ts";

const links = {
  siteUrl: "https://localaicat.com/",
  appStoreUrl: "https://apps.apple.com/app/local-ai-chat/id6741502386",
  downloadUrl: "https://example.test/LocalAIChatDirect.dmg"
};

interface Offer { name: string; price: string; priceCurrency: string; priceSpecification?: { billingDuration: string } }

test("structured data quotes the same prices as the plan cards, in pounds", () => {
  const data = softwareApplicationJsonLd(links) as { offers: Offer[] };
  assert.deepEqual(data.offers.map(offer => offer.name), ["Free", ...directPlans.map(plan => plan.name)]);
  for (const plan of directPlans) {
    const offer = data.offers.find(item => item.name === plan.name)!;
    assert.equal(`£${offer.price}`, plan.price);
    assert.equal(offer.priceCurrency, "GBP");
  }
  assert.equal(data.offers.find(offer => offer.name === "Pro Monthly")!.priceSpecification!.billingDuration, "P1M");
  assert.equal(data.offers.find(offer => offer.name === "Pro Annual")!.priceSpecification!.billingDuration, "P1Y");
  assert.equal(data.offers.find(offer => offer.name === "Developer Mode")!.priceSpecification, undefined);
});

test("structured data and the FAQ give the same minimum systems and tie the App Store name to the site", () => {
  const data = softwareApplicationJsonLd(links) as { operatingSystem: string; alternateName: string; sameAs: string[]; url: string };
  for (const version of Object.values(minimumSystems)) {
    assert.ok(data.operatingSystem.includes(`${version}+`));
    assert.ok(supportedDevicesAnswer.includes(`${version}+`));
  }
  assert.equal(data.alternateName, "Local AI Chat");
  assert.ok(supportedDevicesAnswer.includes("Local AI Chat"));
  assert.deepEqual(data.sameAs, [links.appStoreUrl]);
  assert.equal(data.url, "https://localaicat.com/");
});

test("inline JSON-LD cannot close its script tag", () => {
  const script = jsonLdScript({ note: "</script><script>alert(1)</script>" });
  assert.equal(script.includes("<"), false);
  assert.deepEqual(JSON.parse(script), { note: "</script><script>alert(1)</script>" });
});
