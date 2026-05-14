"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

type DeviceKey = "iphone" | "mac";

type DeviceSpec = {
  key: DeviceKey;
  label: string;
  width: number;
  height: number;
  cornerRadiusRatio: number; // fraction of min(width, height)
};

const DEVICES: Record<DeviceKey, DeviceSpec> = {
  iphone: {
    key: "iphone",
    label: "iPhone 6.9″ (1320 × 2868)",
    width: 1320,
    height: 2868,
    cornerRadiusRatio: 0.085
  },
  mac: {
    key: "mac",
    label: "Mac (2880 × 1800)",
    width: 2880,
    height: 1800,
    cornerRadiusRatio: 0.015
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

type Slot = {
  id: string;
  image: HTMLImageElement | null;
  imageSrc: string | null;
  imageName: string | null;
  titleAbove: string;
  titleBelow: string;
  scale: number; // 0.4 – 1.0
  verticalOffset: number; // -0.2 – 0.2 (fraction of height)
  bezel: "none" | "rounded" | "frame";
  bg: string; // preset id
  textColor: "light" | "dark";
};

function makeSlot(): Slot {
  return {
    id: Math.random().toString(36).slice(2),
    image: null,
    imageSrc: null,
    imageName: null,
    titleAbove: "",
    titleBelow: "",
    scale: 0.78,
    verticalOffset: 0.04,
    bezel: "rounded",
    bg: "duotone",
    textColor: "light"
  };
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
  device: DeviceSpec
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
  const titleHasText = slot.titleAbove.trim().length > 0;
  const subtitleHasText = slot.titleBelow.trim().length > 0;

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
    const lines = wrapText(ctx, slot.titleAbove, width * 0.84);
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
    const lines = wrapText(ctx, slot.titleBelow, width * 0.84);
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

export function ScreenshotTool() {
  const [device, setDevice] = useState<DeviceKey>("iphone");
  const [slots, setSlots] = useState<Record<DeviceKey, Slot[]>>({
    iphone: Array.from({ length: 3 }, makeSlot),
    mac: Array.from({ length: 3 }, makeSlot)
  });
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

  const addSlot = () => {
    setSlots((prev) => ({ ...prev, [device]: [...prev[device], makeSlot()] }));
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => ({
      ...prev,
      [device]: prev[device].filter((s) => s.id !== id)
    }));
  };

  const handleFile = useCallback(
    async (slotId: string, file: File) => {
      const dataUrl = await readFileAsDataURL(file);
      const img = await loadImage(dataUrl);
      updateSlot(slotId, {
        image: img,
        imageSrc: dataUrl,
        imageName: file.name
      });
    },
    [updateSlot]
  );

  // Render previews whenever slots change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait for webfonts so Canvas text uses Manrope/Cormorant, not fallbacks.
      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }
      if (cancelled) return;
      for (const slot of currentSlots) {
        const canvas = previewRefs.current[slot.id];
        if (!canvas) continue;
        renderSlotToCanvas(canvas, slot, currentSpec);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSlots, currentSpec]);

  const exportSlot = useCallback(
    async (slot: Slot, index: number) => {
      setBusy(slot.id);
      try {
        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
        const canvas = document.createElement("canvas");
        renderSlotToCanvas(canvas, slot, currentSpec);
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve();
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const base = (slot.imageName ?? `slot_${index + 1}`).replace(
              /\.(png|jpg|jpeg|webp)$/i,
              ""
            );
            a.href = url;
            a.download = `${currentSpec.key}_${String(index + 1).padStart(
              2,
              "0"
            )}_${base}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            resolve();
          }, "image/png");
        });
      } finally {
        setBusy(null);
      }
    },
    [currentSpec]
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

  const previewScale = useMemo(() => {
    // Display preview at a comfortable size for full-width slot cards.
    const target = device === "iphone" ? 360 : 720;
    return target / currentSpec.width;
  }, [currentSpec.width, device]);

  return (
    <div className="screenshotToolBody">
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
          >
            Export all
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
            onFile={(file) => handleFile(slot.id, file)}
            onUpdate={(patch) => updateSlot(slot.id, patch)}
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
  onFile: (file: File) => void;
  onUpdate: (patch: Partial<Slot>) => void;
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
  onFile,
  onUpdate,
  onRemove,
  onExport,
  canvasRef,
  busy,
  canRemove
}: SlotCardProps) {
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
        <span className="screenshotSlotName">
          {slot.imageName ?? "Empty slot"}
        </span>
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
            <span>Title above</span>
            <input
              type="text"
              value={slot.titleAbove}
              placeholder="Optional headline"
              onChange={(e) => onUpdate({ titleAbove: e.target.value })}
            />
          </label>
          <label className="screenshotField">
            <span>Subtitle below</span>
            <input
              type="text"
              value={slot.titleBelow}
              placeholder="Optional caption"
              onChange={(e) => onUpdate({ titleBelow: e.target.value })}
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
