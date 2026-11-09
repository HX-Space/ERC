import {
  ANALYTICS_THEMES,
  POSITIVE_THEMES,
  THEME_RECS,
  scanThemes,
} from "@/lib/ai";
import { avgPulse } from "@/lib/pulse";
import { addDaysIso } from "@/lib/format";
import type { FollowupRecord, MeetingRecord } from "@/types";
import type { AnalyticsFiltersValue, AnalyticsSummary, DepartmentStat } from "@/types/ui";

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function buildAnalytics(
  allMeetings: MeetingRecord[],
  allFollowups: FollowupRecord[],
  filters: AnalyticsFiltersValue,
  today: string,
): AnalyticsSummary {
  const since = filters.period === "all" ? null : addDaysIso(today, -Number(filters.period));
  const meetings = allMeetings.filter(
    (m) =>
      (!filters.department || m.department === filters.department) &&
      (!since || m.meetingDate >= since),
  );
  const meetingIds = new Set(meetings.map((m) => m.id));
  const followups = allFollowups.filter((f) => meetingIds.has(f.meetingId));

  const pulses = meetings.map((m) => avgPulse(m.pulse)).filter((v): v is number => v != null);
  const hasRisk = (m: MeetingRecord) => !!(m.risk.trim() || m.negative.trim());

  const byDept = new Map<string, MeetingRecord[]>();
  meetings.forEach((m) => byDept.set(m.department, [...(byDept.get(m.department) ?? []), m]));
  const departments: DepartmentStat[] = [...byDept.entries()]
    .map(([department, list]) => ({
      department,
      meetings: list.length,
      avgPulse: mean(list.map((m) => avgPulse(m.pulse)).filter((v): v is number => v != null)),
      riskSignals: list.filter(hasRisk).length,
    }))
    .sort((a, b) => b.meetings - a.meetings);

  const riskTexts = meetings.map((m) => ({ id: m.id, team: m.team, text: `${m.risk}\n${m.negative}` }));
  const posTexts = meetings.map((m) => ({ id: m.id, team: m.team, text: m.positive }));

  const open = followups.filter((f) => f.status === "Open");
  const overdue = open.filter((f) => f.targetDate < today).length;

  return {
    meetings: meetings.length,
    employeesReached: new Set(meetings.flatMap((m) => m.employeeCodes)).size,
    avgPulse: mean(pulses),
    riskSignals: meetings.filter(hasRisk).length,
    followups: {
      open: open.length - overdue,
      overdue,
      closed: followups.length - open.length,
    },
    departments,
    riskThemes: scanThemes(riskTexts, ANALYTICS_THEMES).map((t) => ({
      label: t.label,
      mentions: t.ids.length,
      teams: t.teams,
      recommendation: THEME_RECS[t.label],
    })),
    positiveThemes: scanThemes(posTexts, POSITIVE_THEMES).map((t) => ({
      label: t.label,
      mentions: t.ids.length,
      teams: t.teams,
    })),
  };
}
