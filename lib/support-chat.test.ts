import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.ts";
import {
  isSupportChatPath, supportChatEvent, supportChatInitialMessages, supportChatOrigin, supportChatPaths,
  supportChatVisibilityMessage
} from "./support-chat.ts";

test("support is opt-in per public route, excluding bearer, account and unknown routes", () => {
  for (const pathname of supportChatPaths) assert.equal(isSupportChatPath(pathname), true, pathname);
  assert.equal(isSupportChatPath("/support/"), true);
  for (const pathname of ["/success", "/success/", "/activate", "/activate/", "/manage",
    "/internal", "/internal/architecture", "/api/checkout/id", "/buy/pro-annual",
    "/new-account-page", "/success?checkout_id=secret"]) {
    assert.equal(isSupportChatPath(pathname), false, pathname);
  }
});

test("support message bridge authenticates origin AND frame; ignores unrelated or malformed messages", () => {
  const loaded = 'chatwoot-widget:{"event":"loaded","config":{"authToken":"ignored"}}';
  assert.equal(supportChatEvent(supportChatOrigin, true, loaded), "loaded");
  assert.equal(supportChatEvent("https://attacker.example", true, loaded), null);
  assert.equal(supportChatEvent(`${supportChatOrigin}.attacker.example`, true, loaded), null);
  assert.equal(supportChatEvent(supportChatOrigin, false, loaded), null);
  for (const data of [null, {}, "loaded", "chatwoot-widget:{", "chatwoot-widget:null",
    'chatwoot-widget:{"event":"setAuthCookie","data":{"widgetAuthToken":"ignored"}}',
    'chatwoot-widget:{"event":"popoutChatWindow","baseUrl":"https://attacker.example"}',
    `chatwoot-widget:${" ".repeat(65_536)}`]) {
    assert.equal(supportChatEvent(supportChatOrigin, true, data), null);
  }
  assert.equal(supportChatEvent(supportChatOrigin, true, 'chatwoot-widget:{"event":"closeWindow"}'), "close");
  assert.equal(supportChatEvent(supportChatOrigin, true, 'chatwoot-widget:{"event":"closeChat"}'), "close");
});

test("support handshake contains only fixed presentation settings, no page or identity data", () => {
  const messages = supportChatInitialMessages.map((message) => JSON.parse(message.replace("chatwoot-widget:", "")));
  assert.deepEqual(messages, [
    { event: "config-set", locale: "en", position: "right", hideMessageBubble: true,
      showPopoutButton: false, showUnreadMessagesDialog: false, darkMode: "auto" },
    { event: "toggle-open", isOpen: true }
  ]);
  assert.equal(supportChatVisibilityMessage(false), 'chatwoot-widget:{"event":"toggle-open","isOpen":false}');
  assert.equal(supportChatVisibilityMessage(true), 'chatwoot-widget:{"event":"toggle-open","isOpen":true}');
});

test("CSP allows only Chatwoot frames on public support pages; private routes and host scripts stay isolated", async () => {
  const rules = await nextConfig.headers!();
  const fallback = rules.find((rule) => rule.source === "/(.*)")!;
  const fallbackCsp = fallback.headers.find((header) => header.key === "Content-Security-Policy")!.value;
  assert.match(fallbackCsp, /frame-src 'self';/);
  for (const pathname of ["/success", "/activate", "/manage", "/internal"]) {
    assert.equal(rules.some((rule) => rule.source === pathname), false, pathname);
  }
  for (const pathname of supportChatPaths) {
    const rule = rules.find((item) => item.source === pathname)!;
    const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")!.value;
    assert.match(csp, /frame-src 'self' https:\/\/app\.chatwoot\.com;/);
    const scriptPolicy = csp.split(";").find((directive) => directive.trim().startsWith("script-src"))!;
    assert.doesNotMatch(scriptPolicy, /chatwoot/);
  }
});
