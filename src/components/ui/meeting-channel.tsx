import { Monitor, Phone } from "lucide-react";
import type { MeetingChannel } from "@/types";
import { cn } from "@/lib/format";

export function channelLabel(channel: MeetingChannel): string {
  if (channel === "Face-to-Face") return "P2P";
  return channel;
}

export function MeetingChannelMark({
  channel,
  className,
}: {
  channel: MeetingChannel;
  className?: string;
}) {
  const label = channelLabel(channel);

  if (channel === "Online") {
    return (
      <span
        className={cn("inline-flex items-center text-faint", className)}
        title="Online"
        aria-label="Online"
      >
        <Monitor className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  if (channel === "Phone") {
    return (
      <span
        className={cn("inline-flex items-center text-faint", className)}
        title="Phone"
        aria-label="Phone"
      >
        <Phone className="size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn("text-xs font-semibold tracking-wide text-faint", className)}
      title="Face-to-Face"
      aria-label="P2P"
    >
      {label}
    </span>
  );
}
