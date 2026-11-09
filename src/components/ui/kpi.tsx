import { cn } from "@/lib/format";

/**
 * A KPI is type, not a tile: label over value, no icon, no side bar.
 * Tone colours only the value, and only when it signals something.
 * Wrap several in <KpiStrip> to share one divided container.
 */
export function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "warn" | "risk" | "ok";
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius)] border border-line bg-surface px-5 py-4">
      <KpiBody label={label} value={value} tone={tone} />
    </div>
  );
}

export function KpiBody({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "warn" | "risk" | "ok";
  note?: React.ReactNode;
}) {
  return (
    <>
      <span className="block text-[13px] font-medium text-muted">{label}</span>
      <b
        className={cn(
          "num mt-1.5 block text-[28px] leading-[34px] font-normal tracking-[-0.01em]",
          tone === "warn" && "text-warn",
          tone === "risk" && "text-risk",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
      </b>
      {note ? <span className="mt-1 block text-[12px] text-muted">{note}</span> : null}
    </>
  );
}
