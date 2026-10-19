// Explicit public routes only: a newly added account/billing page never opts in
// to remote support code by accident. This also drives the frame-src policy.
export const supportChatPaths = [
  "/", "/download/app-store", "/outdoor", "/pricing", "/pricing/direct",
  "/pricing/app-store", "/team", "/teams", "/support", "/contact", "/help/ssh",
  "/docs", "/docs/packages", "/screenshots", "/window-management",
  "/privacy", "/privacy/fr", "/terms", "/terms/fr", "/licenses",
  "/space", "/space/studio", "/space/cockpit", "/space/voyage"
] as const;

export const supportChatOrigin = "https://app.chatwoot.com";
// This is a public inbox identifier, never an account or conversation credential.
export const supportChatUrl = `${supportChatOrigin}/widget?website_token=xiyWsj719fc5BZUsg8i4n88i&locale=en`;
const widgetMessagePrefix = "chatwoot-widget:";
const maximumMessageLength = 65_536;

export function isSupportChatPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return supportChatPaths.some((path) => path === normalized);
}

/** Read only the two lifecycle events we use, never contact or conversation data. */
export function supportChatEvent(origin: string, fromWidget: boolean, data: unknown): "loaded" | "close" | null {
  if (origin !== supportChatOrigin || !fromWidget || typeof data !== "string" ||
      data.length > maximumMessageLength || !data.startsWith(widgetMessagePrefix)) return null;
  try {
    const payload: unknown = JSON.parse(data.slice(widgetMessagePrefix.length));
    if (!payload || typeof payload !== "object" || !("event" in payload)) return null;
    if (payload.event === "loaded") return "loaded";
    if (payload.event === "closeWindow" || payload.event === "closeChat") return "close";
  } catch { /* A malformed remote message never affects the host page. */ }
  return null;
}

/** Fixed configuration only. Do not add page URLs, cookies, identities or purchase data. */
export const supportChatInitialMessages = [
  { event: "config-set", locale: "en", position: "left", hideMessageBubble: true,
    showPopoutButton: false, showUnreadMessagesDialog: false, darkMode: "auto" },
  { event: "toggle-open", isOpen: true }
].map((message) => `${widgetMessagePrefix}${JSON.stringify(message)}`);

export function supportChatVisibilityMessage(isOpen: boolean): string {
  return `${widgetMessagePrefix}${JSON.stringify({ event: "toggle-open", isOpen })}`;
}
