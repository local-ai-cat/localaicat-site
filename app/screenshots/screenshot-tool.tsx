"use client";

import JSZip from "jszip";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

const SESSION_MANIFEST_VERSION = 1 as const;
const DEFAULT_LOCALE = "en-US";

type DeviceKey = "iphone" | "mac";

type DeviceSpec = {
  key: DeviceKey;
  label: string;
  width: number;
  height: number;
  cornerRadiusRatio: number; // fraction of min(width, height)
  fastlanePlatform: string; // path segment under fastlane/screenshots/
  fastlanePrefix: string; // prefixed onto <name>.png in the locale dir
};

const DEVICES: Record<DeviceKey, DeviceSpec> = {
  iphone: {
    key: "iphone",
    label: "iPhone 6.9″ (1320 × 2868)",
    width: 1320,
    height: 2868,
    cornerRadiusRatio: 0.085,
    fastlanePlatform: "ios",
    fastlanePrefix: "iPhone 17 Pro Max-"
  },
  mac: {
    key: "mac",
    label: "Mac (2880 × 1800)",
    width: 2880,
    height: 1800,
    cornerRadiusRatio: 0.015,
    fastlanePlatform: "macos",
    fastlanePrefix: ""
  }
};

type BackgroundPreset = {
  id: string;
  label: string;
  paint: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => void;
  cssPreview: string;
};

const BACKGROUNDS: BackgroundPreset[] = [
  {
    id: "site",
    label: "Site",
    cssPreview: "#060606",
    paint: (ctx, w, h) => {
      ctx.fillStyle = "#060606";
      ctx.fillRect(0, 0, w, h);
    }
  },
  {
    id: "surface",
    label: "Surface",
    cssPreview: "#0c0c0b",
    paint: (ctx, w, h) => {
      ctx.fillStyle = "#0c0c0b";
      ctx.fillRect(0, 0, w, h);
    }
  },
  {
    id: "accent",
    label: "Accent",
    cssPreview: "#e8d5b0",
    paint: (ctx, w, h) => {
      ctx.fillStyle = "#e8d5b0";
      ctx.fillRect(0, 0, w, h);
    }
  },
  {
    id: "duotone",
    label: "Duotone",
    cssPreview: "linear-gradient(160deg, #1a1814 0%, #060606 70%)",
    paint: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#1a1814");
      grad.addColorStop(0.7, "#060606");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  },
  {
    id: "warm",
    label: "Warm",
    cssPreview: "linear-gradient(180deg, #2a1a0a 0%, #0a0a0a 100%)",
    paint: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#2a1a0a");
      grad.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  },
  {
    id: "white",
    label: "White",
    cssPreview: "#f0ece4",
    paint: (ctx, w, h) => {
      ctx.fillStyle = "#f0ece4";
      ctx.fillRect(0, 0, w, h);
    }
  }
];

type SlotCopy = { titleAbove: string; titleBelow: string };

type Slot = {
  id: string;
  name: string; // Fastlane filename base (alphanumeric + underscores)
  image: HTMLImageElement | null;
  imageSrc: string | null;
  imageName: string | null;
  copy: Record<string, SlotCopy>; // keyed by locale code
  scale: number; // 0.4 – 1.0
  verticalOffset: number; // -0.2 – 0.2 (fraction of height)
  bezel: "none" | "rounded" | "frame";
  bg: string; // preset id
  textColor: "light" | "dark";
};

function emptyCopy(): SlotCopy {
  return { titleAbove: "", titleBelow: "" };
}

function makeSlot(locales: string[] = [DEFAULT_LOCALE]): Slot {
  const copy: Record<string, SlotCopy> = {};
  for (const locale of locales) {
    copy[locale] = emptyCopy();
  }
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    image: null,
    imageSrc: null,
    imageName: null,
    copy,
    scale: 0.78,
    verticalOffset: 0.04,
    bezel: "rounded",
    bg: "duotone",
    textColor: "light"
  };
}

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function nameForFastlane(slot: Slot, index: number): string {
  const cleaned = slot.name.trim() ? sanitizeName(slot.name) : "";
  if (cleaned) return cleaned;
  if (slot.imageName) {
    const fromImage = sanitizeName(slot.imageName);
    if (fromImage) return fromImage;
  }
  return `slot_${String(index + 1).padStart(2, "0")}`;
}

function getCopy(slot: Slot, locale: string): SlotCopy {
  return slot.copy[locale] ?? emptyCopy();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  ctx.beginPath();
  // Polyfill-style rounded rect for broad support.
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function renderSlotToCanvas(
  canvas: HTMLCanvasElement,
  slot: Slot,
  device: DeviceSpec,
  copy: SlotCopy
) {
  const { width, height } = device;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  const bg = BACKGROUNDS.find((b) => b.id === slot.bg) ?? BACKGROUNDS[0];
  bg.paint(ctx, width, height);

  const textColor = slot.textColor === "light" ? "#f0ece4" : "#0a0a0a";
  const subColor = slot.textColor === "light" ? "#b8b0a4" : "#3a3a3a";

  // Layout: title block (top), screenshot block (middle), subtitle block (bottom)
  const titleHasText = copy.titleAbove.trim().length > 0;
  const subtitleHasText = copy.titleBelow.trim().length > 0;

  const isMac = device.key === "mac";

  // Headline area
  const titlePad = isMac ? height * 0.08 : height * 0.06;
  const titleFontSize = isMac
    ? Math.round(height * 0.052)
    : Math.round(height * 0.04);
  const subtitleFontSize = Math.round(titleFontSize * 0.5);
  const titleLineHeight = Math.round(titleFontSize * 1.05);

  const titleY = titleHasText ? titlePad + titleFontSize : 0;
  if (titleHasText) {
    ctx.fillStyle = textColor;
    ctx.font = `600 ${titleFontSize}px Cormorant Garamond, ui-serif, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const lines = wrapText(ctx, copy.titleAbove, width * 0.84);
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, titleY + i * titleLineHeight);
    });
  }

  if (subtitleHasText) {
    ctx.fillStyle = subColor;
    ctx.font = `500 ${subtitleFontSize}px Manrope, ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const subY = height - (isMac ? height * 0.06 : height * 0.04);
    const lines = wrapText(ctx, copy.titleBelow, width * 0.84);
    lines.forEach((line, i) => {
      const reverseIdx = lines.length - 1 - i;
      ctx.fillText(
        lines[reverseIdx],
        width / 2,
        subY - i * Math.round(subtitleFontSize * 1.25)
      );
    });
  }

  // Screenshot
  if (!slot.image) return;

  const img = slot.image;
  const availableTop = titleHasText
    ? titlePad +
      titleFontSize * (1 + 0.4) +
      Math.round(titleFontSize * 0.3)
    : isMac
      ? height * 0.04
      : height * 0.04;
  const availableBottom = subtitleHasText
    ? height -
      (isMac ? height * 0.06 : height * 0.04) -
      subtitleFontSize * 2.2
    : height - (isMac ? height * 0.04 : height * 0.04);
  const availH = Math.max(availableBottom - availableTop, height * 0.4);
  const availW = width * 0.92;

  // Fit image inside available area, then scale by slot.scale (max 1)
  const imgAspect = img.width / img.height;
  const slotAspect = availW / availH;
  let drawW: number;
  let drawH: number;
  if (imgAspect > slotAspect) {
    drawW = availW * slot.scale;
    drawH = drawW / imgAspect;
  } else {
    drawH = availH * slot.scale;
    drawW = drawH * imgAspect;
  }

  const centerY = availableTop + availH / 2 + slot.verticalOffset * height;
  const x = (width - drawW) / 2;
  const y = centerY - drawH / 2;

  if (slot.bezel === "none") {
    ctx.drawImage(img, x, y, drawW, drawH);
  } else if (slot.bezel === "rounded") {
    const radius = drawW * device.cornerRadiusRatio;
    drawRoundedImage(ctx, img, x, y, drawW, drawH, radius);
  } else {
    // frame: rounded image with a subtle outer bezel line and shadow
    const radius = drawW * device.cornerRadiusRatio;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.round(drawW * 0.04);
    ctx.shadowOffsetY = Math.round(drawW * 0.012);
    drawRoundedImage(ctx, img, x, y, drawW, drawH, radius);
    ctx.restore();
    // Bezel outline
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = Math.max(2, drawW * 0.003);
    drawStrokedRoundedRect(ctx, x, y, drawW, drawH, radius);
    ctx.restore();
  }
}

function drawStrokedRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type SlotManifest = {
  id: string;
  name: string;
  imageName: string | null;
  originalPath: string | null;
  copy: Record<string, SlotCopy>;
  fastlanePaths?: Record<string, string>; // locale → relative path of rendered export
  scale: number;
  verticalOffset: number;
  bezel: Slot["bezel"];
  bg: string;
  textColor: Slot["textColor"];
};

type SessionManifest = {
  version: typeof SESSION_MANIFEST_VERSION;
  createdAt: string;
  device: DeviceKey;
  editingLocale: string;
  locales: string[];
  slotsByDevice: Record<DeviceKey, SlotManifest[]>;
};

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas encoding failed"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

function extensionFor(name: string | null): string {
  if (!name) return "png";
  const m = name.match(/\.(png|jpe?g|webp)$/i);
  if (!m) return "png";
  const ext = m[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ScreenshotTool() {
  const [device, setDevice] = useState<DeviceKey>("iphone");
  const [locales, setLocales] = useState<string[]>([DEFAULT_LOCALE]);
  const [editingLocale, setEditingLocale] = useState<string>(DEFAULT_LOCALE);
  const [slots, setSlots] = useState<Record<DeviceKey, Slot[]>>(() => ({
    iphone: Array.from({ length: 3 }, () => makeSlot([DEFAULT_LOCALE])),
    mac: Array.from({ length: 3 }, () => makeSlot([DEFAULT_LOCALE]))
  }));
  const [busy, setBusy] = useState<string | null>(null);
  const previewRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const currentSpec = DEVICES[device];
  const currentSlots = slots[device];

  const updateSlot = useCallback(
    (id: string, patch: Partial<Slot>) => {
      setSlots((prev) => ({
        ...prev,
        [device]: prev[device].map((s) =>
          s.id === id ? { ...s, ...patch } : s
        )
      }));
    },
    [device]
  );

  const updateSlotCopy = useCallback(
    (id: string, locale: string, patch: Partial<SlotCopy>) => {
      setSlots((prev) => ({
        ...prev,
        [device]: prev[device].map((s) => {
          if (s.id !== id) return s;
          const current = s.copy[locale] ?? emptyCopy();
          return {
            ...s,
            copy: { ...s.copy, [locale]: { ...current, ...patch } }
          };
        })
      }));
    },
    [device]
  );

  const addSlot = () => {
    setSlots((prev) => ({
      ...prev,
      [device]: [...prev[device], makeSlot(locales)]
    }));
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => ({
      ...prev,
      [device]: prev[device].filter((s) => s.id !== id)
    }));
  };

  const addLocale = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    if (locales.includes(code)) {
      setEditingLocale(code);
      return;
    }
    setLocales((prev) => [...prev, code]);
    setSlots((prev) => {
      const next: Record<DeviceKey, Slot[]> = { iphone: [], mac: [] };
      for (const dev of Object.keys(DEVICES) as DeviceKey[]) {
        next[dev] = prev[dev].map((s) => {
          if (s.copy[code]) return s;
          // Seed new locale by copying the editing locale so translators can edit in place.
          const seed = s.copy[editingLocale] ?? emptyCopy();
          return { ...s, copy: { ...s.copy, [code]: { ...seed } } };
        });
      }
      return next;
    });
    setEditingLocale(code);
  };

  const removeLocale = (code: string) => {
    if (locales.length <= 1) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Remove locale "${code}" from every slot? Translations will be discarded.`
      );
      if (!ok) return;
    }
    const remaining = locales.filter((l) => l !== code);
    setLocales(remaining);
    setSlots((prev) => {
      const next: Record<DeviceKey, Slot[]> = { iphone: [], mac: [] };
      for (const dev of Object.keys(DEVICES) as DeviceKey[]) {
        next[dev] = prev[dev].map((s) => {
          if (!(code in s.copy)) return s;
          const { [code]: _removed, ...rest } = s.copy;
          return { ...s, copy: rest };
        });
      }
      return next;
    });
    if (editingLocale === code) {
      setEditingLocale(remaining[0] ?? DEFAULT_LOCALE);
    }
  };

  const handleFile = useCallback(
    async (slotId: string, file: File) => {
      const dataUrl = await readFileAsDataURL(file);
      const img = await loadImage(dataUrl);
      updateSlot(slotId, {
        image: img,
        imageSrc: dataUrl,
        imageName: file.name,
        // Auto-seed Fastlane name from the filename if the user hasn't set one.
        name:
          currentSlots.find((s) => s.id === slotId)?.name?.trim()
            ? currentSlots.find((s) => s.id === slotId)!.name
            : sanitizeName(file.name)
      });
    },
    [updateSlot, currentSlots]
  );

  // Render previews whenever slots OR editing locale change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }
      if (cancelled) return;
      for (const slot of currentSlots) {
        const canvas = previewRefs.current[slot.id];
        if (!canvas) continue;
        renderSlotToCanvas(canvas, slot, currentSpec, getCopy(slot, editingLocale));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSlots, currentSpec, editingLocale]);

  const exportSlot = useCallback(
    async (slot: Slot, index: number) => {
      setBusy(slot.id);
      try {
        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
        const canvas = document.createElement("canvas");
        renderSlotToCanvas(canvas, slot, currentSpec, getCopy(slot, editingLocale));
        const blob = await canvasToBlob(canvas);
        const baseName = nameForFastlane(slot, index);
        const prefix = currentSpec.fastlanePrefix;
        downloadBlob(
          blob,
          `${editingLocale}-${prefix}${baseName}.png`
        );
      } finally {
        setBusy(null);
      }
    },
    [currentSpec, editingLocale]
  );

  const exportAll = async () => {
    for (let i = 0; i < currentSlots.length; i++) {
      const slot = currentSlots[i];
      if (!slot.image) continue;
      await exportSlot(slot, i);
      // Tiny gap so browsers don't suppress sequential downloads.
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const exportSession = useCallback(async () => {
    setBusy("__session__");
    try {
      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }
      const zip = new JSZip();
      const manifest: SessionManifest = {
        version: SESSION_MANIFEST_VERSION,
        createdAt: new Date().toISOString(),
        device,
        editingLocale,
        locales: [...locales],
        slotsByDevice: { iphone: [], mac: [] }
      };

      for (const dev of Object.keys(DEVICES) as DeviceKey[]) {
        const spec = DEVICES[dev];
        const slotMs: SlotManifest[] = [];
        const devSlots = slots[dev];
        for (let i = 0; i < devSlots.length; i++) {
          const slot = devSlots[i];
          const baseName = nameForFastlane(slot, i);
          const idxStr = String(i + 1).padStart(2, "0");
          let originalPath: string | null = null;
          const fastlanePaths: Record<string, string> = {};

          if (slot.imageSrc) {
            const originalBlob = await fetch(slot.imageSrc).then((r) => r.blob());
            const ext = extensionFor(slot.imageName);
            originalPath = `originals/${dev}/${idxStr}_${baseName}.${ext}`;
            zip.file(originalPath, originalBlob);
          }

          if (slot.image) {
            // Render once per locale at the device's native export size.
            for (const locale of locales) {
              const canvas = document.createElement("canvas");
              renderSlotToCanvas(canvas, slot, spec, getCopy(slot, locale));
              const exportBlob = await canvasToBlob(canvas);
              const exportPath = `fastlane/screenshots/${spec.fastlanePlatform}/${locale}/${spec.fastlanePrefix}${baseName}.png`;
              zip.file(exportPath, exportBlob);
              fastlanePaths[locale] = exportPath;
            }
          }

          // Normalise the saved copy map to the manifest's locale set so reimports stay clean.
          const savedCopy: Record<string, SlotCopy> = {};
          for (const locale of locales) {
            savedCopy[locale] = getCopy(slot, locale);
          }

          slotMs.push({
            id: slot.id,
            name: baseName,
            imageName: slot.imageName,
            originalPath,
            copy: savedCopy,
            fastlanePaths,
            scale: slot.scale,
            verticalOffset: slot.verticalOffset,
            bezel: slot.bezel,
            bg: slot.bg,
            textColor: slot.textColor
          });
        }
        manifest.slotsByDevice[dev] = slotMs;
      }

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file(
        "README.txt",
        [
          "Local AI Cat — screenshot session bundle",
          "",
          "Drop fastlane/screenshots/<platform>/<locale>/ into your repo's",
          "fastlane/screenshots/<platform>/<locale>/ to ship localized App Store screenshots.",
          "",
          "Re-import this whole zip on /screenshots to keep editing.",
          ""
        ].join("\n")
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `localaicat-screenshots-${stamp}.zip`);
    } finally {
      setBusy(null);
    }
  }, [device, slots, locales, editingLocale]);

  const importSessionFile = useCallback(async (file: File) => {
    setBusy("__session__");
    try {
      const zip = await JSZip.loadAsync(file);
      const manifestEntry = zip.file("manifest.json");
      if (!manifestEntry) {
        throw new Error("Zip is missing manifest.json");
      }
      const manifest = JSON.parse(
        await manifestEntry.async("string")
      ) as SessionManifest;
      if (manifest.version !== SESSION_MANIFEST_VERSION) {
        throw new Error(
          `Unsupported session version: ${String(manifest.version)}`
        );
      }

      const importedLocales =
        manifest.locales?.length > 0 ? manifest.locales : [DEFAULT_LOCALE];

      const restored: Record<DeviceKey, Slot[]> = { iphone: [], mac: [] };
      for (const dev of Object.keys(DEVICES) as DeviceKey[]) {
        const entries = manifest.slotsByDevice[dev] ?? [];
        const out: Slot[] = [];
        for (const sm of entries) {
          let image: HTMLImageElement | null = null;
          let imageSrc: string | null = null;
          if (sm.originalPath) {
            const f = zip.file(sm.originalPath);
            if (f) {
              const blob = await f.async("blob");
              imageSrc = await blobToDataURL(blob);
              image = await loadImage(imageSrc);
            }
          }
          const copy: Record<string, SlotCopy> = {};
          for (const locale of importedLocales) {
            copy[locale] = sm.copy[locale] ?? emptyCopy();
          }
          out.push({
            id: sm.id,
            name: sm.name,
            image,
            imageSrc,
            imageName: sm.imageName,
            copy,
            scale: sm.scale,
            verticalOffset: sm.verticalOffset,
            bezel: sm.bezel,
            bg: sm.bg,
            textColor: sm.textColor
          });
        }
        restored[dev] =
          out.length > 0
            ? out
            : Array.from({ length: 3 }, () => makeSlot(importedLocales));
      }

      setLocales(importedLocales);
      setEditingLocale(
        importedLocales.includes(manifest.editingLocale)
          ? manifest.editingLocale
          : importedLocales[0]
      );
      setSlots(restored);
      setDevice(manifest.device);
    } catch (err) {
      console.error("Session import failed", err);
      window.alert(
        `Could not import session: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const sessionInputRef = useRef<HTMLInputElement | null>(null);
  const handleSessionInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void importSessionFile(file);
    }
    e.target.value = "";
  };

  const [sessionDragOver, setSessionDragOver] = useState(false);
  const handleSessionDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSessionDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.zip$/i.test(file.name) && file.type !== "application/zip") {
      // Ignore non-zip drops here; per-slot drop targets still handle images.
      return;
    }
    void importSessionFile(file);
  };

  const handleSessionDragOver = (e: DragEvent<HTMLDivElement>) => {
    const items = Array.from(e.dataTransfer.items ?? []);
    const hasZip = items.some(
      (item) =>
        item.kind === "file" &&
        (item.type === "application/zip" || item.type === "application/x-zip-compressed")
    );
    if (!hasZip) return;
    e.preventDefault();
    setSessionDragOver(true);
  };

  const previewScale = useMemo(() => {
    // Display preview at a comfortable size for full-width slot cards.
    const target = device === "iphone" ? 360 : 720;
    return target / currentSpec.width;
  }, [currentSpec.width, device]);

  const anySlotHasImage = (Object.keys(DEVICES) as DeviceKey[]).some((d) =>
    slots[d].some((s) => s.image !== null)
  );

  return (
    <div
      className={
        sessionDragOver
          ? "screenshotToolBody screenshotToolBodyDropActive"
          : "screenshotToolBody"
      }
      onDragOver={handleSessionDragOver}
      onDragLeave={() => setSessionDragOver(false)}
      onDrop={handleSessionDrop}
    >
      <div className="screenshotSessionBar">
        <div className="screenshotSessionHint">
          Drop a session <code>.zip</code> anywhere to resume editing, or use
          the buttons.
        </div>
        <div className="screenshotSessionActions">
          <input
            ref={sessionInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleSessionInput}
            hidden
          />
          <button
            type="button"
            className="screenshotBtn screenshotBtnGhost"
            onClick={() => sessionInputRef.current?.click()}
            disabled={busy !== null}
          >
            Import session…
          </button>
          <button
            type="button"
            className="screenshotBtn"
            onClick={() => void exportSession()}
            disabled={busy !== null || !anySlotHasImage}
          >
            {busy === "__session__" ? "Packaging…" : "Export session (.zip)"}
          </button>
        </div>
      </div>

      <div className="screenshotToolBar">
        <div className="screenshotTabs" role="tablist">
          {(Object.keys(DEVICES) as DeviceKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={device === key}
              className={
                device === key
                  ? "screenshotTab screenshotTabActive"
                  : "screenshotTab"
              }
              onClick={() => setDevice(key)}
            >
              {DEVICES[key].label}
            </button>
          ))}
        </div>
        <div className="screenshotLocales" role="tablist" aria-label="Locale">
          {locales.map((code) => (
            <span key={code} className="screenshotLocaleChipWrap">
              <button
                type="button"
                role="tab"
                aria-selected={editingLocale === code}
                className={
                  editingLocale === code
                    ? "screenshotLocaleChip screenshotLocaleChipActive"
                    : "screenshotLocaleChip"
                }
                onClick={() => setEditingLocale(code)}
              >
                {code}
              </button>
              {locales.length > 1 ? (
                <button
                  type="button"
                  className="screenshotLocaleChipRemove"
                  aria-label={`Remove locale ${code}`}
                  onClick={() => removeLocale(code)}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          <button
            type="button"
            className="screenshotLocaleAdd"
            onClick={() => {
              if (typeof window === "undefined") return;
              const code = window.prompt(
                "Locale code (e.g. fr-FR, de-DE, es-ES, ja)"
              );
              if (code) addLocale(code);
            }}
          >
            + Locale
          </button>
        </div>
        <div className="screenshotActions">
          <button
            type="button"
            className="screenshotBtn screenshotBtnGhost"
            onClick={addSlot}
            disabled={currentSlots.length >= 10}
          >
            + Add slot
          </button>
          <button
            type="button"
            className="screenshotBtn"
            onClick={exportAll}
            disabled={!currentSlots.some((s) => s.image) || busy !== null}
            title={`Downloads ${editingLocale} only. Use Export session for all locales.`}
          >
            Export {editingLocale}
          </button>
        </div>
      </div>

      <div className="screenshotGrid">
        {currentSlots.map((slot, index) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            index={index}
            spec={currentSpec}
            previewScale={previewScale}
            editingLocale={editingLocale}
            onFile={(file) => handleFile(slot.id, file)}
            onUpdate={(patch) => updateSlot(slot.id, patch)}
            onUpdateCopy={(patch) =>
              updateSlotCopy(slot.id, editingLocale, patch)
            }
            onRemove={() => removeSlot(slot.id)}
            onExport={() => exportSlot(slot, index)}
            canvasRef={(el) => {
              previewRefs.current[slot.id] = el;
            }}
            busy={busy === slot.id}
            canRemove={currentSlots.length > 1}
          />
        ))}
      </div>
    </div>
  );
}

type SlotCardProps = {
  slot: Slot;
  index: number;
  spec: DeviceSpec;
  previewScale: number;
  editingLocale: string;
  onFile: (file: File) => void;
  onUpdate: (patch: Partial<Slot>) => void;
  onUpdateCopy: (patch: Partial<SlotCopy>) => void;
  onRemove: () => void;
  onExport: () => void;
  canvasRef: (el: HTMLCanvasElement | null) => void;
  busy: boolean;
  canRemove: boolean;
};

function SlotCard({
  slot,
  index,
  spec,
  previewScale,
  editingLocale,
  onFile,
  onUpdate,
  onUpdateCopy,
  onRemove,
  onExport,
  canvasRef,
  busy,
  canRemove
}: SlotCardProps) {
  const copy = getCopy(slot, editingLocale);
  const fastlaneBase = nameForFastlane(slot, index);
  const [dragOver, setDragOver] = useState(false);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const displayW = Math.round(spec.width * previewScale);
  const displayH = Math.round(spec.height * previewScale);

  return (
    <article className="screenshotSlot">
      <div className="screenshotSlotHead">
        <span className="screenshotSlotIndex">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="screenshotSlotNameField">
          <input
            type="text"
            value={slot.name}
            placeholder={slot.imageName ?? "fastlane_name"}
            onChange={(e) => onUpdate({ name: e.target.value })}
            aria-label="Fastlane name"
          />
          <span className="screenshotSlotNameHint">
            {spec.fastlanePlatform}/{editingLocale}/{spec.fastlanePrefix}
            {fastlaneBase}.png
          </span>
        </div>
        {canRemove ? (
          <button
            type="button"
            className="screenshotIconBtn"
            onClick={onRemove}
            aria-label="Remove slot"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="screenshotSlotMain">
        <div
          className="screenshotPreview"
          style={{ width: displayW, height: displayH }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: displayW, height: displayH }}
          />
        </div>

        <label
          className={
            dragOver
              ? "screenshotDrop screenshotDropActive"
              : "screenshotDrop"
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleInput}
            hidden
          />
          <span>
            {slot.image ? "Replace image" : "Drop or choose image"}
          </span>
        </label>
      </div>

      <div className="screenshotSlotControls">
        <div className="screenshotFieldGroup">
          <label className="screenshotField">
            <span>Title above ({editingLocale})</span>
            <input
              type="text"
              value={copy.titleAbove}
              placeholder="Optional headline"
              onChange={(e) => onUpdateCopy({ titleAbove: e.target.value })}
            />
          </label>
          <label className="screenshotField">
            <span>Subtitle below ({editingLocale})</span>
            <input
              type="text"
              value={copy.titleBelow}
              placeholder="Optional caption"
              onChange={(e) => onUpdateCopy({ titleBelow: e.target.value })}
            />
          </label>
        </div>

        <div className="screenshotFieldGroup">
          <label className="screenshotField">
            <span>Scale ({Math.round(slot.scale * 100)}%)</span>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.01}
              value={slot.scale}
              onChange={(e) =>
                onUpdate({ scale: Number(e.target.value) })
              }
            />
          </label>
          <label className="screenshotField">
            <span>Vertical ({Math.round(slot.verticalOffset * 100)}%)</span>
            <input
              type="range"
              min={-0.2}
              max={0.2}
              step={0.01}
              value={slot.verticalOffset}
              onChange={(e) =>
                onUpdate({ verticalOffset: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="screenshotFieldGroup">
          <label className="screenshotField">
            <span>Frame</span>
            <select
              value={slot.bezel}
              onChange={(e) =>
                onUpdate({ bezel: e.target.value as Slot["bezel"] })
              }
            >
              <option value="rounded">Rounded corners</option>
              <option value="frame">Rounded + bezel</option>
              <option value="none">Edge to edge</option>
            </select>
          </label>
          <label className="screenshotField">
            <span>Text colour</span>
            <select
              value={slot.textColor}
              onChange={(e) =>
                onUpdate({ textColor: e.target.value as Slot["textColor"] })
              }
            >
              <option value="light">Light text</option>
              <option value="dark">Dark text</option>
            </select>
          </label>
        </div>

        <div className="screenshotBgRow" role="radiogroup" aria-label="Background">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              role="radio"
              aria-checked={slot.bg === bg.id}
              className={
                slot.bg === bg.id
                  ? "screenshotBgChip screenshotBgChipActive"
                  : "screenshotBgChip"
              }
              style={{ background: bg.cssPreview }}
              onClick={() => onUpdate({ bg: bg.id })}
              title={bg.label}
            />
          ))}
        </div>

        <button
          type="button"
          className="screenshotBtn"
          onClick={onExport}
          disabled={!slot.image || busy}
        >
          {busy ? "Exporting…" : `Export ${spec.width} × ${spec.height}`}
        </button>
      </div>
    </article>
  );
}
