import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/format";

export function PulseStats({
  current,
  average,
  trend,
}: {
  current: string;
  average: string;
  trend: "up" | "down" | "flat" | null;
}) {
  const trendLabel =
    trend === "up"
      ? "Improving"
      : trend === "down"
        ? "Declining"
        : trend === "flat"
          ? "Stable"
          : "No trend";

  const TrendIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : trend === "flat"
          ? ArrowRight
          : Minus;

  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 rounded-[5px] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tracking-[-0.01em] text-ink"
        title="Current pulse"
      >
        <span className="font-medium text-muted">Pulse</span>
        <span className="mono">{current}</span>
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-[5px] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tracking-[-0.01em] text-ink"
        title="Historical average"
      >
        <span className="font-medium text-muted">Avg</span>
        <span className="mono">{average}</span>
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.01em]",
          trend === "up" && "bg-ok-soft text-ok",
          trend === "down" && "bg-risk-soft text-risk",
          trend === "flat" && "bg-info-soft text-info",
          !trend && "bg-surface-2 text-muted",
        )}
        title="Pulse trend"
      >
        <TrendIcon className="size-3.5" strokeWidth={2} aria-hidden />
        <span className={cn(trend ? "opacity-80" : undefined)}>Trend</span>
        <span>{trendLabel}</span>
      </span>
    </>
  );
}
