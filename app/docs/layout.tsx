import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteShell } from "../_components/site-shell";

export const metadata: Metadata = {
  title: { default: "Modules", template: "%s | Local AI Cat Modules" },
  description: "See what every Local AI Cat module does, where it ships, and how thoroughly it is tested."
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <SiteShell wide>{children}</SiteShell>;
}
