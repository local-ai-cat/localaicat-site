import type { Metadata } from "next";
import { SiteShell } from "../_components/site-shell";
import { CrewExperience } from "./crew-experience";

export const metadata: Metadata = {
  title: "Teams & enterprise",
  description: "Bring your crew. Local AI Cat for teams, with a license for each person and managed enterprise rollouts."
};

export default function TeamsPage() {
  return <SiteShell><CrewExperience /></SiteShell>;
}
