import { localeFor, type Lang } from "@/lib/i18n";

export function formatDate(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!iso) return "–";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(localeFor(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The organisation's timezone: decides when "today" starts for due dates. */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Cairo";

/** Today's date as YYYY-MM-DD in the organisation's timezone (not the server's). */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
