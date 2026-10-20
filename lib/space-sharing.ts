import type { Metadata } from "next";

/** The homepage's own card. Other pages share with their own title and description. */
export const homeShareCopy = {
  title: "Local AI Cat · A little universe, all yours.",
  description: "Your own Space Cadet. On-device chat, transcription, and models."
} as const;
export const spaceShareImage = "/assets/space-cadet-share-20261017.png";
export const spaceShareVideo = "/share-study/space-share-motion-v3.mp4";

/**
 * The shared artwork for every page. Without `copy`, cards take each page's own title and description;
 * the homepage passes `homeShareCopy` (Next replaces openGraph as a whole, so a page override must carry the artwork too).
 */
export function spaceSharingMetadata(
  siteUrl: string,
  previewHost?: string,
  copy?: { title: string; description: string }
): Pick<Metadata, "metadataBase" | "openGraph" | "twitter"> {
  // Preview cards must resolve to the preview's artwork, never the production host.
  const origin = new URL(previewHost ? `https://${previewHost}` : siteUrl);
  const image = {
    url: new URL(spaceShareImage, origin).href,
    width: 1200,
    height: 630,
    alt: "Space Cadet and a tethered rocket. Local AI Cat — a little universe, all yours.",
    type: "image/png"
  };
  // Messages can play a direct MP4 in its link card; other clients keep the still.
  const video = {
    url: new URL(spaceShareVideo, origin).href,
    type: "video/mp4",
    width: 1200,
    height: 630
  };
  const pageCopy = copy ? { title: copy.title, description: copy.description } : {};
  return {
    metadataBase: origin,
    openGraph: {
      ...pageCopy,
      ...(copy ? { url: origin.href } : {}),
      siteName: "Local AI Cat",
      locale: "en_GB",
      type: "website",
      images: [image],
      videos: [video]
    },
    twitter: { card: "summary_large_image", ...pageCopy, images: [image] }
  };
}
