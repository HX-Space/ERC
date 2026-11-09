import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { KpiBody } from "@/components/ui/kpi";
import { addDaysIso, cn, formatDate } from "@/lib/format";
import { formatPulse } from "@/lib/pulse";
import type { DepartmentStat, ThemeInsight } from "@/types/ui";

export interface DueItem {
  id: string;
  meetingId: string;
  item: string;
  targetDate: string;
  people: string[];
  days: number;
}

export interface DashboardData {
  today: string;
  open: DueItem[];
  overdueCount: number;
  oldestLate: number;
  oldestLateItem: DueItem | null;
  dueThisWeek: number;
  meetingsLast30: number;
  meetingsPrior30: number;
  pulseAvg: number | null;
  pulseCount: number;
  departments: DepartmentStat[];
  riskThemes: ThemeInsight[];
  recent: Array<{
    id: string;
    date: string;
    people: string[];
    department: string;
    team: string;
    type: string;
    pulse: number | null;
    openFollowups: number;
  }>;
  totalMeetings: number;
  feedback: Array<{
    code: string;
    name: string;
    title: string;
    team: number;
    submitted: number;
    drafts: number;
  }>;
  cycle: string;
  canCreate: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function peopleLabel(people: string[]) {
  if (!people.length) return "—";
  if (people.length === 1) return people[0];
  return `${people[0]} +${people.length - 1}`;
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ---------- The due line ---------- */

const DUE_ROWS = 8;

function DueLine({ items: all, today }: { items: DueItem[]; today: string }) {
  // The most urgent first (already sorted), capped so the card stays one screen tall.
  const items = all.slice(0, DUE_ROWS);
  const hidden = all.length - items.length;
  // Window: two weeks back to three weeks ahead, widened to fit every open item.
  const minDays = Math.min(-14, ...items.map((i) => i.days - 3));
  const maxDays = Math.max(21, ...items.map((i) => i.days + 3));
  const span = maxDays - minDays;
  const pos = (d: number) => `${((d - minDays) / span) * 100}%`;

  // Ticks on Mondays, every 1-4 weeks so at most ~5 labels fit across the plot.
  const todayDow = new Date(`${today}T12:00:00`).getDay(); // 0 Sun
  const toMonday = ((1 - todayDow + 7) % 7) - 7; // last Monday on or before today
  const step = 7 * Math.max(1, Math.ceil(span / 7 / 5));
  const ticks: number[] = [];
  for (let d = toMonday + Math.ceil((minDays - toMonday) / step) * step; d <= maxDays; d += step) ticks.push(d);

  const plotLines = (
    <>
      {ticks.map((t) => (
        <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-grid" style={{ left: pos(t) }} />
      ))}
      <span aria-hidden className="absolute inset-y-0 w-px bg-accent" style={{ left: pos(0) }} />
    </>
  );

  if (!items.length) {
    return (
      <p className="rounded-[8px] border border-dashed border-line-2 px-4 py-3 text-[14px] text-muted">
        No open follow-ups. Everything raised in meetings has been actioned.
      </p>
    );
  }

  return (
    <div role="table" aria-label="Open follow-ups by target date">
      {/* Axis */}
      <div role="row" className="grid grid-cols-[minmax(0,1fr)_96px] gap-x-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_96px]">
        <span role="columnheader" className="pb-2 text-[12px] text-muted">
          Follow-up
        </span>
        <div role="columnheader" className="relative hidden h-7 sm:block" aria-label="Target date">
          {ticks.filter((t) => Math.abs(t) > span / 9 && (t - minDays) / span > 0.04 && (maxDays - t) / span > 0.06).map((t) => (
            <span
              key={t}
              className="num absolute top-0 -translate-x-1/2 text-[12px] whitespace-nowrap text-muted"
              style={{ left: pos(t) }}
            >
              {shortDate(addDaysIso(today, t))}
            </span>
          ))}
          <span
            className="absolute top-0 -translate-x-1/2 rounded-[4px] bg-surface px-1 text-[12px] font-medium whitespace-nowrap text-accent"
            style={{ left: pos(0) }}
          >
            Today
          </span>
        </div>
        <span role="columnheader" className="pb-2 text-right text-[12px] text-muted">
          Against target
        </span>
      </div>

      {items.map((f) => {
        const late = f.days < 0;
        return (
          <div
            key={f.id}
            role="row"
            className="grid min-h-[48px] grid-cols-[minmax(0,1fr)_96px] items-center gap-x-4 border-t border-rule sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_96px]"
          >
            <div role="cell" className="min-w-0 py-1.5">
              <p className="truncate text-[14px] text-ink" title={f.item}>
                {f.item}
              </p>
              <p className="truncate text-[12px] text-muted">
                <span className="mono">{f.meetingId}</span> · {peopleLabel(f.people)}
              </p>
            </div>
            <div role="cell" className="relative hidden h-full self-stretch sm:block" aria-label={`Target ${formatDate(f.targetDate)}`}>
              {plotLines}
              {late ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-risk/25"
                  style={{ left: pos(f.days), width: `calc(${pos(0)} - ${pos(f.days)})` }}
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute top-1/2 h-px -translate-y-1/2 bg-accent/35"
                  style={{ left: pos(0), width: `calc(${pos(f.days)} - ${pos(0)})` }}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface",
                  late ? "bg-risk" : "bg-accent",
                )}
                style={{ left: pos(f.days) }}
              />
            </div>
            <p
              role="cell"
              className={cn(
                "num text-right text-[13px] whitespace-nowrap",
                late ? "font-medium text-risk" : f.days <= 7 ? "text-ink" : "text-muted",
              )}
            >
              {late
                ? `${plural(-f.days, "day")} late`
                : f.days === 0
                  ? "Due today"
                  : `in ${plural(f.days, "day")}`}
              <span className="block text-[12px] font-normal text-muted">{shortDate(f.targetDate)}</span>
            </p>
          </div>
        );
      })}
      {hidden > 0 ? (
        <p className="border-t border-rule pt-3 text-[13px] text-muted">
          {hidden} more open follow-up{hidden === 1 ? "" : "s"} with later targets ·{" "}
          <Link href="/follow-ups" className="font-medium text-ink hover:text-accent">
            Review all {all.length}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/* ---------- View ---------- */

export function DashboardView({ data }: { data: DashboardData }) {
  const finding = data.oldestLateItem
    ? `${plural(data.overdueCount, "follow-up")} past target — the oldest, “${data.oldestLateItem.item}”, is ${plural(data.oldestLate, "day")} late.`
    : data.open.length
      ? `Nothing is overdue. ${plural(data.dueThisWeek, "follow-up")} due in the next 7 days.`
      : "No open follow-ups.";

  const maxConcern = Math.max(1, ...data.departments.map((d) => d.meetings));
  const totalTeam = data.feedback.reduce((a, m) => a + m.team, 0);
  const totalSubmitted = data.feedback.reduce((a, m) => a + m.submitted, 0);
  const meetingsDelta = data.meetingsLast30 - data.meetingsPrior30;

  return (
    <>
      <header className="page-head">
        <div className="min-w-0">
          <h1>Overview</h1>
          <p className={cn(data.overdueCount > 0 && "text-ink")}>{finding}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.canCreate ? (
            <Link
              href="/meetings"
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <Plus className="size-4" strokeWidth={1.75} />
              New meeting
            </Link>
          ) : null}
          <Link
            href="/follow-ups"
            className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-primary px-3.5 text-[13px] font-medium text-primary-ink transition-opacity hover:opacity-90"
          >
            Review follow-ups
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {/* KPI strip: one container, divided */}
      <section
        aria-label="Key figures"
        className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-line lg:grid-cols-4 [&>div]:border-line [&>div]:px-5 [&>div]:py-4"
      >
        <div className="border-r border-b lg:border-b-0">
          <KpiBody
            label="Open follow-ups"
            value={data.open.length}
            note={`${data.dueThisWeek} due in the next 7 days`}
          />
        </div>
        <div className="border-b lg:border-r lg:border-b-0">
          <KpiBody
            label="Past target"
            value={data.overdueCount}
            tone={data.overdueCount > 0 ? "risk" : undefined}
            note={data.overdueCount ? `oldest ${plural(data.oldestLate, "day")} late` : "none late"}
          />
        </div>
        <div className="border-r">
          <KpiBody
            label="Meetings, last 30 days"
            value={data.meetingsLast30}
            note={
              data.meetingsPrior30 === 0 && data.meetingsLast30 > 0
                ? `+${data.meetingsLast30} (none the 30 days before)`
                : `${meetingsDelta > 0 ? "+" : ""}${meetingsDelta} vs the 30 days before`
            }
          />
        </div>
        <div>
          <KpiBody
            label="Average pulse, 90 days"
            value={
              data.pulseAvg == null ? (
                <span className="text-faint">—</span>
              ) : (
                <>
                  {formatPulse(data.pulseAvg)}
                  <span className="text-[16px] text-muted"> /5</span>
                </>
              )
            }
            note={`from ${plural(data.pulseCount, "individual review")}`}
          />
        </div>
      </section>

      {/* Row 1: the due line and where concerns come from */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Follow-ups against target">
            <div className="flex items-center gap-4 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-risk" aria-hidden />
                Past target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-accent" aria-hidden />
                Open
              </span>
            </div>
          </PanelHeader>
          <PanelBody>
            <DueLine items={data.open} today={data.today} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Concerns raised">
            <span className="text-[12px] text-muted">Last 90 days</span>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-5">
            {data.departments.length ? (
              <ul className="flex flex-col">
                {data.departments.map((d) => (
                  <li key={d.department} className="border-t border-rule py-2.5 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[14px] text-ink">{d.department}</span>
                      <span className="num text-[13px] whitespace-nowrap text-muted">
                        <b className={cn("font-medium", d.riskSignals > 0 ? "text-ink" : "text-muted")}>
                          {d.riskSignals}
                        </b>{" "}
                        of {plural(d.meetings, "meeting")}
                      </span>
                    </div>
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-line-2"
                        style={{ width: `${(d.meetings / maxConcern) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-accent"
                        style={{ width: `${(d.riskSignals / maxConcern) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">No meetings in the last 90 days.</p>
            )}

            {data.riskThemes.length ? (
              <div className="rounded-[8px] bg-surface-2 px-4 py-3">
                <p className="text-[12px] text-muted">Recurring themes · keyword scan</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {data.riskThemes.map((t) => (
                    <li key={t.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{t.label}</span>
                      <span className="num whitespace-nowrap text-muted">{plural(t.mentions, "meeting")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </PanelBody>
        </Panel>
      </div>

      {/* Row 2: recent meetings and the feedback cycle */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Recent meetings">
            <Link
              href="/meetings"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:text-accent"
            >
              All {data.totalMeetings}
              <ArrowRight className="size-3.5" strokeWidth={1.75} />
            </Link>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-[92px]">ID</th>
                  <th className="w-[96px] text-right">Date</th>
                  <th>Employees</th>
                  <th className="w-[96px]">Type</th>
                  <th className="w-[72px] text-right">Pulse</th>
                  <th className="w-[96px] text-right">Open items</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      No meetings recorded yet. ER specialists add them from Meetings.
                    </td>
                  </tr>
                ) : null}
                {data.recent.map((m) => (
                  <tr key={m.id}>
                    <td className="mono whitespace-nowrap text-muted">{m.id}</td>
                    <td className="num text-right whitespace-nowrap">{shortDate(m.date)}</td>
                    <td className="min-w-0">
                      <span className="block truncate text-ink">{peopleLabel(m.people)}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {m.department} · {m.team}
                      </span>
                    </td>
                    <td className="text-muted">{m.type}</td>
                    <td className="num text-right">
                      {m.pulse == null ? <span className="text-faint">—</span> : formatPulse(m.pulse)}
                    </td>
                    <td className="num text-right">
                      {m.openFollowups ? m.openFollowups : <span className="text-faint">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Manager feedback">
            <span className="text-[12px] text-muted">{data.cycle}</span>
          </PanelHeader>
          <PanelBody>
            <p className="text-[13px] text-muted">
              <b className="num text-[20px] font-normal text-ink">{totalSubmitted}</b>
              <span className="num"> of {totalTeam}</span> reviews submitted
            </p>
            {data.feedback.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">No managers with active teams in the directory yet.</p>
            ) : null}
            <ul className="mt-3 flex flex-col">
              {data.feedback.map((m) => {
                const pct = m.team ? m.submitted / m.team : 0;
                return (
                  <li key={m.code} className="border-t border-rule py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px] text-ink">{m.name}</span>
                      <span className="num text-[13px] whitespace-nowrap text-muted">
                        {m.submitted} / {m.team}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      {pct > 0 ? (
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
