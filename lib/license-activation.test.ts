import assert from "node:assert/strict";
import test from "node:test";
import { activationLinkForToken } from "./license-activation.ts";
test("no token can become a custom-scheme link", () => {
  for (const value of ["valid-token", "tok&key=SECRET#frag", ""]) assert.equal(activationLinkForToken(value), null);
});
