import {
  getDirectDownloadBuild,
  getDirectDownloadPublishedAt,
  getDirectDownloadUrl,
  getDirectDownloadVersion
} from "./env.ts";

export type DirectDownloadReleaseInfo = {
  build: string | null;
  downloadUrl: string;
  publishedAt: string | null;
  version: string | null;
};

export type AppcastItem = {
  /** Sparkle's channel; null is the default channel every install gets, i.e. stable. */
  channel: string | null;
  build: string | null;
  version: string | null;
  publishedAt: string | null;
  downloadUrl: string | null;
};

function parseTag(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "i"));
  return match?.[1]?.trim() || null;
}

/** Every <item> in a Sparkle appcast, in feed order. */
export function appcastItems(xml: string): AppcastItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, item]) => ({
    channel: parseTag(item, "sparkle:channel"),
    build: parseTag(item, "sparkle:version"),
    version: parseTag(item, "sparkle:shortVersionString"),
    publishedAt: formatPublishedAt(parseTag(item, "pubDate")),
    downloadUrl: item.match(/<enclosure\b[^>]*\burl="([^"]+)"/i)?.[1] ?? null
  }));
}

/** The newest item on a channel (null for stable). The merged feed lists a beta before the stable release. */
export function appcastItemForChannel(xml: string, channel: string | null): AppcastItem | null {
  return appcastItems(xml).find(item => item.channel === channel) ?? null;
}

function formatPublishedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export function getAppcastUrl(downloadUrl: string) {
  const marker = "/releases/latest/download/";
  const markerIndex = downloadUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return `${downloadUrl.slice(0, markerIndex + marker.length)}appcast.xml`;
}

async function fetchAppcastReleaseInfo(downloadUrl: string) {
  const appcastUrl = getAppcastUrl(downloadUrl);
  if (!appcastUrl) {
    return {
      build: null,
      publishedAt: null,
      version: null
    };
  }

  try {
    const response = await fetch(appcastUrl, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return {
        build: null,
        publishedAt: null,
        version: null
      };
    }

    const stable = appcastItemForChannel(await response.text(), null);
    return {
      build: stable?.build ?? null,
      publishedAt: stable?.publishedAt ?? null,
      version: stable?.version ?? null
    };
  } catch {
    return {
      build: null,
      publishedAt: null,
      version: null
    };
  }
}

export async function getDirectDownloadReleaseInfo(): Promise<DirectDownloadReleaseInfo | null> {
  const downloadUrl = getDirectDownloadUrl()?.trim();
  if (!downloadUrl) {
    return null;
  }

  const envVersion = getDirectDownloadVersion();
  const envBuild = getDirectDownloadBuild();
  const envPublishedAt = getDirectDownloadPublishedAt();

  if (envVersion && envBuild && envPublishedAt) {
    return {
      build: envBuild,
      downloadUrl,
      publishedAt: envPublishedAt,
      version: envVersion
    };
  }

  const appcast = await fetchAppcastReleaseInfo(downloadUrl);

  return {
    build: envBuild ?? appcast.build,
    downloadUrl,
    publishedAt: envPublishedAt ?? appcast.publishedAt,
    version: envVersion ?? appcast.version
  };
}
