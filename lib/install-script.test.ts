import assert from "node:assert/strict";
import test from "node:test";
import { buildDirectInstallScript, EXPECTED_TEAM_ID } from "./install-script.ts";

test("the installer verifies the app's signature and team before clearing quarantine", () => {
  const script = buildDirectInstallScript({
    downloadUrl: "https://example.invalid/LocalAIChatDirect.dmg",
    version: "1.4.0",
    build: "394",
    publishedAt: null
  });
  const verify = script.indexOf("codesign --verify --deep --strict");
  const team = script.indexOf('[ "$TEAM_ID" != "$EXPECTED_TEAM_ID" ]');
  const copy = script.indexOf("/bin/cp -R");
  const unquarantine = script.indexOf("/usr/bin/xattr -cr");
  assert.ok(script.includes(`EXPECTED_TEAM_ID='${EXPECTED_TEAM_ID}'`));
  assert.ok(verify > 0 && team > verify, "signature and team checks are present");
  assert.ok(copy > team && unquarantine > team, "nothing is installed or unquarantined before the checks");
});
