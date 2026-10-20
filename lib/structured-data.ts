import { directPlans } from "./catalog.ts";
import { appStoreName, operatingSystems, productName, productSummary } from "./product-facts.ts";

interface StructuredDataLinks {
  readonly siteUrl: string;
  readonly appStoreUrl: string;
  readonly downloadUrl: string;
}

const billingDurations: Record<string, string> = { "Pro Monthly": "P1M", "Pro Annual": "P1Y" };

function poundsFrom(price: string): string {
  const amount = price.replace(/[^0-9.]/g, "");
  if (!amount) throw new Error(`No amount in price "${price}"`);
  return amount;
}

function planOffer(plan: (typeof directPlans)[number], pricingUrl: string): object {
  const price = poundsFrom(plan.price);
  const duration = billingDurations[plan.name];
  return {
    "@type": "Offer",
    name: plan.name,
    price,
    priceCurrency: "GBP",
    url: pricingUrl,
    ...(duration
      ? { priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "GBP", billingDuration: duration } }
      : {})
  };
}

/** The app as search and answer engines should describe it, with the prices the plan cards show. */
export function softwareApplicationJsonLd({ siteUrl, appStoreUrl, downloadUrl }: StructuredDataLinks): object {
  const origin = siteUrl.replace(/\/$/, "");
  const pricingUrl = `${origin}/pricing`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: productName,
    alternateName: appStoreName,
    applicationCategory: "ProductivityApplication",
    operatingSystem: operatingSystems,
    description: productSummary,
    url: `${origin}/`,
    downloadUrl,
    sameAs: [appStoreUrl],
    image: `${origin}/space-demo/cadet-touch-180.png`,
    publisher: {
      "@type": "Organization",
      name: productName,
      url: `${origin}/`,
      logo: `${origin}/space-demo/cadet-touch-180.png`,
      email: "support@localaicat.com"
    },
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "GBP", url: pricingUrl },
      ...directPlans.map(plan => planOffer(plan, pricingUrl))
    ]
  };
}

/** Inline-safe JSON for a `<script type="application/ld+json">`: no `<` can close the tag. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
