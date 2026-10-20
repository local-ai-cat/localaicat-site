import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/env";

interface SitemapPage {
  readonly path: string;
  readonly priority: number;
  readonly changeFrequency: "weekly" | "monthly" | "yearly";
}

// Public pages only: purchase results (/success, /cancel), redirects (/download) and internal tools stay out.
const PAGES: readonly SitemapPage[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/space", priority: 0.8, changeFrequency: "monthly" },
  { path: "/outdoor", priority: 0.8, changeFrequency: "monthly" },
  { path: "/download/app-store", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing/direct", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pricing/app-store", priority: 0.7, changeFrequency: "monthly" },
  { path: "/teams", priority: 0.7, changeFrequency: "monthly" },
  { path: "/team", priority: 0.7, changeFrequency: "monthly" },
  { path: "/support", priority: 0.7, changeFrequency: "monthly" },
  { path: "/window-management", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/manage", priority: 0.5, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy/fr", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms/fr", priority: 0.3, changeFrequency: "yearly" },
  { path: "/licenses", priority: 0.3, changeFrequency: "monthly" }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  return PAGES.map(page => ({
    url: `${siteUrl}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }));
}
