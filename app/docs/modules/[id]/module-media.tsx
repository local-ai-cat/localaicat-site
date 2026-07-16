import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

type ModuleMediaProps = {
  id: string;
  name: string;
  caption?: string;
};

type MediaAsset = {
  kind: "video" | "image" | "poster";
  src: string;
  poster?: string;
};

function publicAsset(id: string, extension: string) {
  const relativePath = `/feature-media/${id}.${extension}`;
  return {
    path: path.join(process.cwd(), "public", relativePath),
    url: relativePath
  };
}

function resolveMedia(id: string): MediaAsset | undefined {
  const mp4 = publicAsset(id, "mp4");
  const gif = publicAsset(id, "gif");
  const posters = ["webp", "jpg", "png"].map((extension) => publicAsset(id, extension));
  const poster = posters.find((candidate) => existsSync(candidate.path));

  if (existsSync(mp4.path)) return { kind: "video", src: mp4.url, poster: poster?.url };
  if (existsSync(gif.path)) return { kind: "image", src: gif.url };
  if (poster) return { kind: "poster", src: poster.url };
  return undefined;
}

export function ModuleMedia({ id, name, caption }: ModuleMediaProps) {
  const media = resolveMedia(id);
  const defaultCaption = "A short walkthrough will appear here when the module's UI test media is ready.";

  return (
    <figure className="moduleMedia">
      <div
        className="moduleMediaFrame"
        data-gif={`/feature-media/${id}.gif`}
        data-mp4={`/feature-media/${id}.mp4`}
      >
        {media?.kind === "video" ? (
          <video controls playsInline poster={media.poster} preload="metadata">
            <source src={media.src} type="video/mp4" />
          </video>
        ) : null}
        {media?.kind === "image" || media?.kind === "poster" ? (
          <Image
            alt={`${name} walkthrough`}
            fill
            sizes="(max-width: 760px) 100vw, 900px"
            src={media.src}
            unoptimized={media.kind === "image"}
          />
        ) : null}
        {!media ? (
          <div className="moduleMediaEmpty">
            <span aria-hidden="true" className="moduleMediaPlay">▶</span>
            <strong>Walkthrough coming soon</strong>
            <span>UI-test video · GIF fallback</span>
          </div>
        ) : null}
      </div>
      <figcaption>{caption ?? defaultCaption}</figcaption>
    </figure>
  );
}
