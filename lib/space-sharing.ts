import type { Metadata } from "next";

const title = "Local AI Cat · A little universe, all yours.";
const description = "Your own Space Cadet. On-device chat, transcription, and models.";
export const spaceShareImage = "/assets/space-cadet-share-20261017.png";
export const spaceShareVideo = "/share-study/space-share-motion-v3.mp4";

export function spaceSharingMetadata(siteUrl: string, previewHost?: string): Pick<Metadata, "metadataBase" | "openGraph" | "twitter"> {
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
  return {
    metadataBase: origin,
    openGraph: { title, description, url: origin.href, siteName: "Local AI Cat", type: "website", images: [image], videos: [video] },
    twitter: { card: "summary_large_image", title, description, images: [image] }
  };
}
