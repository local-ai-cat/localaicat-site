"use client";

import { usePathname } from "next/navigation";
import { isBearerPath } from "../../lib/bearer-urls";
import { supportChatUrl } from "../../lib/site-telemetry-privacy";

/** Chatwoot runs on its own origin, never in the document that handles purchases. */
export function SupportChat(): React.JSX.Element | null {
  const pathname = usePathname();
  if (isBearerPath(pathname)) return null;

  return (
    <a
      href={supportChatUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label="Chat support — opens Chatwoot in a new tab"
      title="Chat with us on Chatwoot in a separate tab"
      style={{
        position: "fixed", bottom: 18, left: 18, zIndex: 40,
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 15px", borderRadius: 999,
        border: "1px solid var(--line, #40394e)",
        background: "var(--surface, #211b2d)", color: "var(--text, #eee8fb)",
        fontFamily: "var(--font-body), sans-serif", fontSize: 13,
        textDecoration: "none", boxShadow: "0 3px 18px #0002"
      }}
    >
      <span aria-hidden="true">☏</span> Chat support <span aria-hidden="true">↗</span>
    </a>
  );
}
