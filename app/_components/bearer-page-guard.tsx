"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isBearerPath } from "../../lib/bearer-urls";

declare global {
  interface Window {
    $chatwoot?: unknown;
  }
}

/**
 * A client-side navigation (Back) can bring a chat SDK that loaded on another
 * page onto /success or /activate, where it would see the bearer URL. A fresh
 * document load leaves it unloaded there (public/js/cookie-consent.js).
 */
export function BearerPageGuard() {
  const pathname = usePathname();
  useEffect(() => {
    if (isBearerPath(pathname) && window.$chatwoot) {
      window.location.reload();
    }
  }, [pathname]);
  return null;
}
