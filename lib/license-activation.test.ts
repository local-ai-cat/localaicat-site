import assert from "node:assert/strict";
import test from "node:test";
import { activationLinkForToken } from "./license-activation.ts";

test("activationLinkForToken carries only the token in a fixed localaichat://activate link", () => {
  const url = new URL(activationLinkForToken("tok&key=MEOW-PRO-X#frag"));
  assert.equal(url.protocol, "localaichat:");
  assert.equal(url.host, "activate");
  assert.deepEqual([...url.searchParams.keys()], ["t"]);
  assert.equal(url.searchParams.get("t"), "tok&key=MEOW-PRO-X#frag");
  assert.equal(url.searchParams.get("key"), null);
});
