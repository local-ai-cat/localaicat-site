"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./stats.module.css";
import { niceTicks } from "../../lib/stats-range";

export type ExplorerSeries = { name: string; tone: "lavender" | "mint" | "amber"; values: number[] };
export type ExplorerMetric = {
  id: string;
  label: string;
  /** "downloads", read after the number: "1,203 downloads". */
  unit: string;
  /** The y axis's top label after its number: "downloads a month". */
  axis: string;
  total: number | null;
  series: ExplorerSeries[] | null;
  note: string;
  /** Said instead of a chart when the metric isn't available on this deployment. */
  off: string;
};
export type ExplorerProps = {
  range: string;
  ranges: { range: string; label: string }[];
  /** "in the last 30 days", "since february 2025". */
  span: string;
  labels: string[];
  metrics: ExplorerMetric[];
};

/** The drawing's own units; the SVG stretches to the column and keeps its strokes one pixel wide. */
const WIDTH = 1000;
const HEIGHT = 360;
const MORPH_MS = 720;
const TONES = { lavender: "#bda4eb", mint: "#91cbb3", amber: "#eebe7a" } as const;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const change = (): void => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return reduced;
}

function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * Tweens to the target layers: every metric or range switch reshapes the curves from where they were. A layer
 * that appears grows from the baseline; a different number of points starts from the baseline too.
 */
function useMorph(target: number[][], reduced: boolean): number[][] {
  const [shown, setShown] = useState<number[][]>(() => target.map(layer => layer.map(() => 0)));
  const current = useRef(shown);
  const key = JSON.stringify(target);
  useEffect(() => {
    const goal = JSON.parse(key) as number[][];
    if (reduced) { current.current = goal; setShown(goal); return; }
    const from = goal.map((layer, layerIndex) => layer.map((_, index) => {
      const previous = current.current[layerIndex];
      return previous && previous.length === layer.length ? previous[index] : 0;
    }));
    const start = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const progress = easeOut(Math.min(1, (now - start) / MORPH_MS));
      const next = goal.map((layer, layerIndex) => layer.map((value, index) => from[layerIndex][index] + (value - from[layerIndex][index]) * progress));
      current.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, reduced]);
  return shown;
}

/** Counts from the last shown value to the new one, so a switch reads as a change rather than a swap. */
function CountTo({ value, reduced }: { value: number; reduced: boolean }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / MORPH_MS);
      setShown(Math.round(origin + (value - origin) * easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); from.current = value; };
  }, [value, reduced]);
  return <>{shown.toLocaleString("en-US")}</>;
}

type Point = { x: number; y: number };

/** A smooth curve through the points that never overshoots them (monotone cubic, Fritsch–Carlson). */
function smoothPath(points: Point[], move = true): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `${move ? "M" : "L"}${points[0].x},${points[0].y}`;
  const slopes: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    slopes.push((points[index + 1].y - points[index].y) / (points[index + 1].x - points[index].x));
  }
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let index = 0; index < slopes.length; index += 1) {
    if (slopes[index] === 0) { tangents[index] = 0; tangents[index + 1] = 0; continue; }
    const a = tangents[index] / slopes[index];
    const b = tangents[index + 1] / slopes[index];
    const length = Math.hypot(a, b);
    if (length > 3) {
      tangents[index] = (3 / length) * a * slopes[index];
      tangents[index + 1] = (3 / length) * b * slopes[index];
    }
  }
  let path = `${move ? "M" : "L"}${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const step = (points[index + 1].x - points[index].x) / 3;
    path += ` C${points[index].x + step},${points[index].y + tangents[index] * step} ${points[index + 1].x - step},${points[index + 1].y - tangents[index + 1] * step} ${points[index + 1].x},${points[index + 1].y}`;
  }
  return path;
}

function axisLabels(labels: string[]): { index: number; label: string }[] {
  if (labels.length <= 2) return labels.map((label, index) => ({ index, label }));
  const middle = Math.floor((labels.length - 1) / 2);
  return [0, middle, labels.length - 1].map(index => ({ index, label: labels[index] }));
}

export function StatsExplorer({ range, ranges, span, labels, metrics }: ExplorerProps) {
  const [active, setActive] = useState(metrics[0]?.id);
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const metric = metrics.find(entry => entry.id === active) ?? metrics[0];
  const series = metric.series ?? [];

  // Layers stack bottom up: each is the running total of the series under it and itself.
  const target = series.map((_, layerIndex) => labels.map((__, index) =>
    series.slice(0, layerIndex + 1).reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0)));
  const layers = useMorph(target, reduced);
  const totals = labels.map((_, index) => target.at(-1)?.[index] ?? 0);
  const ticks = niceTicks(Math.max(0, ...totals));
  // The scale eases with the curves, so a switch never jumps the axis under them.
  const peak = useMorph([[ticks[ticks.length - 1]]], reduced)[0]?.[0] || 1;

  const count = labels.length;
  const x = (index: number): number => count <= 1 ? WIDTH / 2 : (index / (count - 1)) * WIDTH;
  const y = (value: number): number => HEIGHT - (value / peak) * HEIGHT;

  return (
    <section className={styles.explorer} aria-label="Stats over time">
      <p className={styles.reading} aria-live="polite">
        {metric.total === null
          ? <span className={styles.readingOff}>{metric.off}</span>
          : <><b><CountTo value={metric.total} reduced={reduced} /></b> {metric.unit} {span}</>}
      </p>

      <div className={styles.chart} onMouseLeave={() => setHover(null)}>
        <svg className={styles.plot} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img"
          aria-label={metric.total === null ? metric.off : `${metric.label}, ${metric.total} ${span}`}>
          <defs>
            {Object.entries(TONES).map(([tone, color]) => (
              <linearGradient key={tone} id={`stats-fill-${tone}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={color} stopOpacity="0.04" />
              </linearGradient>
            ))}
          </defs>
          {ticks.slice(1).map(tick => (
            <line key={tick} className={styles.gridLine} x1="0" x2={WIDTH} y1={y(tick)} y2={y(tick)} />
          ))}
          {layers.map((layer, layerIndex) => {
            const upper = layer.map((value, index) => ({ x: x(index), y: y(value) }));
            const lower = (layers[layerIndex - 1] ?? layer.map(() => 0)).map((value, index) => ({ x: x(index), y: y(value) })).reverse();
            const tone = series[layerIndex]?.tone ?? "lavender";
            return <path key={layerIndex} d={`${smoothPath(upper)} ${smoothPath(lower, false)} Z`} fill={`url(#stats-fill-${tone})`} />;
          })}
          {/* Outlines top layer first, so where an upper layer is empty its line gives way to the one it rests on. */}
          {[...layers.keys()].reverse().map(layerIndex => (
            <path key={`line-${layerIndex}`} className={styles.curve} stroke={TONES[series[layerIndex]?.tone ?? "lavender"]}
              d={smoothPath(layers[layerIndex].map((value, index) => ({ x: x(index), y: y(value) })))} />
          ))}
        </svg>

        {series.length > 0 && (
          <div className={styles.scale} aria-hidden="true">
            {ticks.map((tick, index) => (
              <span key={tick} style={{ top: `${(y(tick) / HEIGHT) * 100}%` }}>
                {tick.toLocaleString("en-US")}{index === ticks.length - 1 ? ` ${metric.axis}` : ""}
              </span>
            ))}
          </div>
        )}

        {hover !== null && series.length > 0 && (
          <>
            <div className={styles.guide} style={{ left: `${(x(hover) / WIDTH) * 100}%` }} />
            {layers.map((layer, layerIndex) => (
              <i key={layerIndex} className={styles.dot}
                style={{ left: `${(x(hover) / WIDTH) * 100}%`, top: `${(y(layer[hover] ?? 0) / HEIGHT) * 100}%`, background: TONES[series[layerIndex].tone] }} />
            ))}
            <div className={styles.tip} data-edge={hover > count * 0.75 ? "end" : hover < count * 0.25 ? "start" : undefined}
              style={{ left: `${(x(hover) / WIDTH) * 100}%` }}>
              <b>{labels[hover]}</b>
              <span>{totals[hover].toLocaleString("en-US")} {metric.unit}</span>
              {series.length > 1 && series.map(entry => (
                <span key={entry.name} className={styles.tipPart} data-tone={entry.tone}>{entry.name} {entry.values[hover] ?? 0}</span>
              ))}
            </div>
          </>
        )}

        <div className={styles.targets}>
          {labels.map((label, index) => (
            <span key={index} aria-hidden="true" onMouseEnter={() => setHover(index)} onTouchStart={() => setHover(index)} title={label} />
          ))}
        </div>
      </div>
      <div className={styles.axis} aria-hidden="true">
        {axisLabels(labels).map(entry => (
          <span key={entry.index} style={{ left: `${(x(entry.index) / WIDTH) * 100}%` }}>{entry.label}</span>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.metrics} role="tablist" aria-label="What the chart shows">
          {metrics.map(entry => (
            <button key={entry.id} type="button" role="tab" aria-selected={entry.id === metric.id} className={styles.metric}
              onClick={() => { setActive(entry.id); setHover(null); }}>
              {entry.label}
            </button>
          ))}
        </div>
        <nav className={styles.ranges} aria-label="Range">
          {ranges.map(option => (
            <Link key={option.range} href={`/stats?range=${option.range}`} scroll={false} prefetch={false}
              aria-current={option.range === range ? "page" : undefined}>
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {series.length > 1 && (
        <p className={styles.key}>{series.map(entry => <span key={entry.name} data-tone={entry.tone}>{entry.name}</span>)}</p>
      )}
      <p className={styles.note}>{metric.note}</p>
    </section>
  );
}
