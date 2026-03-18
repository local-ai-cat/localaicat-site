"use client";

import { useCallback, useRef } from "react";

type DragToggleProps<T extends string> = {
  options: readonly [T, T];
  labels: readonly [string, string];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "default" | "compact";
};

export function DragToggle<T extends string>({
  options,
  labels,
  value,
  onChange,
  className,
  size = "default",
}: DragToggleProps<T>) {
  const switchRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLSpanElement | null>(null);
  const dragState = useRef<{ startX: number; startValue: T; dragging: boolean } | null>(null);

  const isRight = value === options[1];

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = { startX: e.clientX, startValue: value, dragging: false };
    },
    [value]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !sliderRef.current || !switchRef.current) return;
      const dx = e.clientX - dragState.current.startX;
      if (!dragState.current.dragging && Math.abs(dx) > 6) {
        dragState.current.dragging = true;
        switchRef.current.setPointerCapture(e.pointerId);
      }
      if (!dragState.current.dragging) return;

      const trackWidth = switchRef.current.offsetWidth / 2 - 4;
      const baseOffset = dragState.current.startValue === options[1] ? trackWidth : 0;
      const clamped = Math.max(0, Math.min(trackWidth, baseOffset + dx));

      sliderRef.current.style.transition = "none";
      sliderRef.current.style.transform = `translateX(${clamped}px)`;
    },
    [options]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !sliderRef.current) {
        dragState.current = null;
        return;
      }

      sliderRef.current.style.transition = "";
      sliderRef.current.style.transform = "";

      if (dragState.current.dragging) {
        const dx = e.clientX - dragState.current.startX;
        const threshold = 30;
        if (dx > threshold && dragState.current.startValue === options[0]) {
          onChange(options[1]);
        } else if (dx < -threshold && dragState.current.startValue === options[1]) {
          onChange(options[0]);
        }
      }
      dragState.current = null;
    },
    [options, onChange]
  );

  const sizeClass = size === "compact" ? "modeSwitchCompact" : "";

  return (
    <div
      aria-label="Toggle"
      className={`modeSwitch ${sizeClass} ${className ?? ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={switchRef}
      role="tablist"
      style={{ touchAction: "pan-y" }}
    >
      <span
        aria-hidden="true"
        className={`modeSwitchSlider ${isRight ? "modeSwitchSliderRight" : ""}`}
        ref={sliderRef}
      />
      <button
        aria-selected={value === options[0]}
        className={value === options[0] ? "isActive" : undefined}
        onClick={() => onChange(value === options[0] ? options[1] : options[0])}
        role="tab"
        type="button"
      >
        {labels[0]}
      </button>
      <button
        aria-selected={value === options[1]}
        className={value === options[1] ? "isActive" : undefined}
        onClick={() => onChange(value === options[1] ? options[0] : options[1])}
        role="tab"
        type="button"
      >
        {labels[1]}
      </button>
    </div>
  );
}
