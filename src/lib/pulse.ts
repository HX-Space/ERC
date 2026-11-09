import type { PulseScores } from "@/types";

export function avgPulse(pulse: PulseScores | null | undefined): number | null {
  if (!pulse) return null;
  const nums = Object.values(pulse).filter(
    (v): v is number => typeof v === "number",
  );
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function formatPulse(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "–";
  return value.toFixed(1);
}

export function trendOf(series: number[]): "up" | "down" | "flat" | null {
  if (series.length < 2) return null;
  const delta = series[series.length - 1] - series[0];
  if (delta >= 0.5) return "up";
  if (delta <= -0.5) return "down";
  return "flat";
}

export function emptyPulse(): PulseScores {
  return { c: null, a: null, d: null, i: null, l: null, s: null };
}
