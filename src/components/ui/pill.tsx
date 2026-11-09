import { cn } from "@/lib/format";

const tones = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  risk: "bg-risk-soft text-risk",
  info: "bg-info-soft text-info",
  mute: "bg-surface-2 text-muted",
  ai: "bg-ai-soft text-ai",
} as const;

export function Pill({
  tone = "mute",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
