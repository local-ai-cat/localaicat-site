"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * GoatCounter pageviews: cookieless, so no consent banner. The script's own
 * onload count is off because client-side navigation would never trigger it;
 * this component counts every path change instead. Only production hosts
 * count (not meow staging or previews), and only the path is sent, never the query string.
 */
const COUNT_URL = "https://localaicat.goatcounter.com/count";
const SCRIPT_URL = "https://gc.zgo.at/count.js";
const COUNTED_HOSTS = ["localaicat.com", "www.localaicat.com"];

function isCountedHost(hostname: string): boolean {
  return COUNTED_HOSTS.includes(hostname);
}

type GoatCounterClient = { count: (vars: { path: string }) => void };

declare global {
  interface Window {
    goatcounter?: Partial<GoatCounterClient>;
  }
}

function countPageview(): void {
  const { hostname, pathname } = window.location;
  if (!isCountedHost(hostname)) {
    return;
  }
  window.goatcounter?.count?.({ path: pathname });
}

export function GoatCounter(): React.JSX.Element {
  const pathname = usePathname();

  useEffect(() => {
    countPageview();
  }, [pathname]);

  return (
    <Script
      data-goatcounter={COUNT_URL}
      data-goatcounter-settings='{"no_onload": true}'
      src={SCRIPT_URL}
      strategy="afterInteractive"
      onLoad={countPageview}
    />
  );
}
