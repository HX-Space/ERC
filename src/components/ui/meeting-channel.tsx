import { Monitor, Phone } from "lucide-react";
import type { MeetingChannel } from "@/types";
import { cn } from "@/lib/format";
import { makeT, type Lang } from "@/lib/i18n";

export function channelLabel(channel: MeetingChannel, lang: Lang = "en"): string {
  const t = makeT(lang);
  if (channel === "Face-to-Face") return t("P2P", "وجهاً لوجه");
  if (channel === "Online") return t("Online", "عبر الإنترنت");
  if (channel === "Phone") return t("Phone", "هاتفياً");
  return channel;
}

export function MeetingChannelMark({
  channel,
  className,
  lang = "en",
}: {
  channel: MeetingChannel;
  className?: string;
  lang?: Lang;
}) {
  const t = makeT(lang);
  const label = channelLabel(channel, lang);

  if (channel === "Online") {
    return (
      <span
        className={cn("inline-flex items-center text-faint", className)}
        title={t("Online", "عبر الإنترنت")}
        aria-label={t("Online", "عبر الإنترنت")}
      >
        <Monitor className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  if (channel === "Phone") {
    return (
      <span
        className={cn("inline-flex items-center text-faint", className)}
        title={t("Phone", "هاتفياً")}
        aria-label={t("Phone", "هاتفياً")}
      >
        <Phone className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn("text-xs font-semibold tracking-wide text-faint", className)}
      title={t("Face-to-Face", "وجهاً لوجه")}
      aria-label={label}
    >
      {label}
    </span>
  );
}
