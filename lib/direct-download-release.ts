import {
  getDirectDownloadBuild,
  getDirectDownloadPublishedAt,
  getDirectDownloadUrl,
  getDirectDownloadVersion
} from "./env";

export type DirectDownloadReleaseInfo = {
  build: string | null;
  downloadUrl: string;
  publishedAt: string | null;
  version: string | null;
};

function parseTag(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "i"));
  return match?.[1]?.trim() || null;
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

function getAppcastUrl(downloadUrl: string) {
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

    const xml = await response.text();
    return {
      build: parseTag(xml, "sparkle:version"),
      publishedAt: formatPublishedAt(parseTag(xml, "pubDate")),
      version: parseTag(xml, "sparkle:shortVersionString")
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
