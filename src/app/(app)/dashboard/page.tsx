import { requireView } from "@/lib/session";
import { canCreateMeetings } from "@/lib/rbac";
import { FEEDBACK_CYCLE } from "@/lib/constants";
import { buildAnalytics } from "@/lib/analytics";
import { avgPulse } from "@/lib/pulse";
import { addDaysIso, todayIso } from "@/lib/format";
import { listEmployees, listManagers } from "@/repositories/employees";
import { listFeedbackForManager } from "@/repositories/feedback";
import { listFollowups } from "@/repositories/followups";
import { listMeetings } from "@/repositories/meetings";
import { DashboardView, type DashboardData } from "./components/DashboardView";

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export default async function DashboardPage() {
  const user = await requireView("dashboard");
  const today = todayIso();

  const [meetings, followups, employees, managers] = await Promise.all([
    listMeetings(),
    listFollowups(),
    listEmployees(),
    listManagers(),
  ]);
  const feedbackByManager = await Promise.all(
    managers.map((m) => listFeedbackForManager(m.code, FEEDBACK_CYCLE)),
  );

  /* Follow-ups: every open item against today. */
  const open = followups
    .filter((f) => f.status === "Open")
    .map((f) => ({
      id: f.id,
      meetingId: f.meetingId,
      item: f.item,
      targetDate: f.targetDate,
      people: f.employeeNames ?? [],
      days: daysBetween(today, f.targetDate), // negative = days late
    }))
    .sort((a, b) => a.days - b.days);
  const overdue = open.filter((f) => f.days < 0);
  const dueThisWeek = open.filter((f) => f.days >= 0 && f.days <= 7);

  /* Meetings: the last 30 days against the 30 before. */
  const since30 = addDaysIso(today, -30);
  const since60 = addDaysIso(today, -60);
  const last30 = meetings.filter((m) => m.meetingDate >= since30 && m.meetingDate <= today).length;
  const prior30 = meetings.filter((m) => m.meetingDate >= since60 && m.meetingDate < since30).length;

  /* Pulse: individual reviews in the last 90 days. */
  const since90 = addDaysIso(today, -90);
  const pulses = meetings
    .filter((m) => m.meetingDate >= since90)
    .map((m) => avgPulse(m.pulse))
    .filter((v): v is number => v != null);
  const pulseAvg = pulses.length ? pulses.reduce((a, b) => a + b, 0) / pulses.length : null;

  /* Concerns by department and recurring themes (same scan as Analytics). */
  const analytics = buildAnalytics(meetings, followups, { department: "", period: "90" }, today);

  /* Manager feedback cycle: submitted against active team size. */
  const feedback = managers
    .map((m, i) => {
      const team = employees.filter((e) => e.managerCode === m.code && e.status === "Active").length;
      const submitted = feedbackByManager[i].filter((f) => f.status === "Submitted").length;
      const drafts = feedbackByManager[i].filter((f) => f.status === "Draft").length;
      return { code: m.code, name: m.name, title: m.title, team, submitted, drafts };
    })
    .filter((m) => m.team > 0)
    .sort((a, b) => b.submitted / b.team - a.submitted / a.team);

  const data: DashboardData = {
    today,
    open,
    overdueCount: overdue.length,
    oldestLate: overdue.length ? -overdue[0].days : 0,
    oldestLateItem: overdue[0] ?? null,
    dueThisWeek: dueThisWeek.length,
    meetingsLast30: last30,
    meetingsPrior30: prior30,
    pulseAvg,
    pulseCount: pulses.length,
    departments: analytics.departments,
    riskThemes: analytics.riskThemes.slice(0, 3),
    recent: meetings.slice(0, 5).map((m) => ({
      id: m.id,
      date: m.meetingDate,
      people: m.employeeNames ?? [],
      department: m.department,
      team: m.team,
      type: m.meetingType,
      pulse: avgPulse(m.pulse),
      openFollowups: followups.filter((f) => f.meetingId === m.id && f.status === "Open").length,
    })),
    totalMeetings: meetings.length,
    feedback,
    cycle: FEEDBACK_CYCLE,
    canCreate: canCreateMeetings(user.role),
  };

  return <DashboardView data={data} />;
}
