import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/buy/[slug]/route.ts";

const CHECKOUT_ENV_NAMES = [
  "POLAR_CHECKOUT_URL_PRO_MONTHLY",
  "POLAR_CHECKOUT_URL_PRO_ANNUAL",
  "POLAR_CHECKOUT_URL_DEVELOPER_MODE"
] as const;
const originalEnv = new Map(CHECKOUT_ENV_NAMES.map((key) => [key, process.env[key]]));

test.afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function buy(slug: string): Promise<Response> {
  return GET(new Request(`https://preview.example/buy/${slug}?price=1&redirect=https://evil.example`), {
    params: Promise.resolve({ slug })
  });
}

test("each personal plan redirects only to its server-configured Polar checkout", async () => {
  for (const [index, slug] of ["pro-monthly", "pro-annual", "developer-mode"].entries()) {
    const checkout = `https://buy.polar.sh/polar_cl_${slug}`;
    process.env[CHECKOUT_ENV_NAMES[index]] = checkout;
    const response = await buy(slug);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), checkout);
  }
});

test("an unconfigured or unsafe checkout returns to pricing with an honest notice", async () => {
  for (const configured of [undefined, "https://evil.example/checkout"]) {
    if (configured) process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE = configured;
    else delete process.env.POLAR_CHECKOUT_URL_DEVELOPER_MODE;
    const response = await buy("developer-mode");
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://preview.example/pricing/direct?checkout=unavailable&plan=developer-mode");
  }
});

test("team checkout keeps its seat-aware flow and unknown plans stay on pricing", async () => {
  assert.equal((await buy("team-annual")).headers.get("location"), "https://preview.example/team");
  assert.equal((await buy("unknown")).headers.get("location"), "https://preview.example/pricing/direct");
});
