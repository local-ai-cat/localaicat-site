import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { SpaceDesigns } from "../_components/space-designs";

export const metadata: Metadata = {
  title: "A little universe to explore",
  description: "Make your own cat, try the menu bar and wander through a universe of little discoveries."
};

export default function SpaceDesignsPage() {
  return <SiteShell><SpaceDesigns /></SiteShell>;
}
