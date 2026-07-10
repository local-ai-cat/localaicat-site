import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteShell } from "../_components/site-shell";
import { DocsNav } from "./_components/docs-nav";

export const metadata: Metadata = {
  title: { default: "Documentation", template: "%s | Local AI Cat Docs" },
  description: "Documentation for Local AI Cat features and its local API."
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <DocsNav />
      {children}
    </SiteShell>
  );
}
