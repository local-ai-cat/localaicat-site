import { directPlans } from "../../lib/catalog";
import { getAppStoreUrl, getSiteUrl } from "../../lib/env";
import { appStoreName, operatingSystems, productName, productSummary } from "../../lib/product-facts";

export const dynamic = "force-static";

/** Plain facts for answer engines (llmstxt.org), quoted from the same constants as the FAQ and plan cards. */
export function GET(): Response {
  const site = getSiteUrl().replace(/\/$/, "");
  const prices = directPlans.map(plan => `- ${plan.name}: ${plan.price} ${plan.cadence.replace(/^\//, "per ")}`).join("\n");
  const body = `# ${productName}

> ${productSummary}

- Also known as: ${appStoreName} (the App Store listing: ${getAppStoreUrl()})
- Platforms: ${operatingSystems}
- Privacy: chats, recordings and models stay on the device. No account is needed for the free app.
- Builds: Indoor Cat is the App Store build for iPhone, iPad and Mac. Outdoor Cat is the direct-download Mac build with the full macOS feature set.

## Prices (GBP)

- Free: £0, chat, transcription and local models
${prices}

## Pages

- [FAQ](${site}/support): offline use, devices, how it compares, licenses
- [Pricing](${site}/pricing)
- [Outdoor Cat](${site}/outdoor): the direct-download Mac build
- [App Store](${site}/download/app-store)
- [Teams](${site}/teams)
- [Privacy](${site}/privacy)
- [SSH from iPhone: file access on macOS](${site}/help/ssh)
- [Contact](${site}/contact): support@localaicat.com
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
