import { todayIso } from "@/lib/format";
import type { FollowupRecord } from "@/types";

export function isOverdue(
  fu: FollowupRecord,
  today = todayIso(),
): boolean {
  return fu.status === "Open" && fu.targetDate < today;
}
