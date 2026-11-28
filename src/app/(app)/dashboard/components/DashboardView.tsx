import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { KpiBody } from "@/components/ui/kpi";
import { addDaysIso, cn, formatDate } from "@/lib/format";
import { formatPulse } from "@/lib/pulse";
import { localeFor, type Lang, type T } from "@/lib/i18n";
import { getLang, getT } from "@/lib/i18n-server";
import type { DepartmentStat, ThemeInsight } from "@/types/ui";

export interface DueItem {
  id: string;
  meetingId: string;
  item: string;
  targetDate: string;
  people: string[];
  codes: string[];
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
    codes: string[];
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
  canAnalytics: boolean;
  canFeedback: boolean;
  canMeetings: boolean;
}

/** History for the first employee on a record. */
function historyHref(codes: string[]) {
  return codes[0] ? `/employees?code=${encodeURIComponent(codes[0])}` : "/employees";
}

/** Makes the whole positioned parent clickable while keeping one real link. */
const STRETCH = "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[6px] focus-visible:after:ring-2 focus-visible:after:ring-accent";

/** Nouns with Arabic singular, dual and plural forms. English adds "s". */
type Unit = { en: string; ar: [one: string, two: string, many: string] };
const DAY: Unit = { en: "day", ar: ["يوم", "يومان", "أيام"] };
const FOLLOW_UP: Unit = { en: "follow-up", ar: ["متابعة", "متابعتان", "متابعات"] };
const MEETING: Unit = { en: "meeting", ar: ["اجتماع", "اجتماعان", "اجتماعات"] };
const REVIEW: Unit = { en: "individual review", ar: ["مراجعة فردية", "مراجعتان فرديتان", "مراجعات فردية"] };

function plural(lang: Lang, n: number, unit: Unit) {
  if (lang === "ar") {
    const word = n === 1 ? unit.ar[0] : n === 2 ? unit.ar[1] : unit.ar[2];
    return `${n} ${word}`;
  }
  return `${n} ${n === 1 ? unit.en : `${unit.en}s`}`;
}

function peopleLabel(people: string[]) {
  if (!people.length) return "—";
  if (people.length === 1) return people[0];
  return `${people[0]} +${people.length - 1}`;
}

function shortDate(iso: string, lang: Lang) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" });
}

/* ---------- The due line ---------- */

const DUE_ROWS = 8;

function DueLine({ items: all, today, t, lang }: { items: DueItem[]; today: string; t: T; lang: Lang }) {
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
      {ticks.map((tick) => (
        <span key={tick} aria-hidden className="absolute inset-y-0 w-px bg-grid" style={{ left: pos(tick) }} />
      ))}
      <span aria-hidden className="absolute inset-y-0 w-px bg-accent" style={{ left: pos(0) }} />
    </>
  );

  if (!items.length) {
    return (
      <p className="rounded-[8px] border border-dashed border-line-2 px-4 py-3 text-[14px] text-muted">
        {t(
          "No open follow-ups. Everything raised in meetings has been actioned.",
          "لا توجد متابعات مفتوحة. تمت معالجة كل ما طُرح في الاجتماعات.",
        )}
      </p>
    );
  }

  return (
    <div role="table" aria-label={t("Open follow-ups by target date", "المتابعات المفتوحة حسب الموعد المستهدف")}>
      {/* Axis */}
      <div role="row" className="grid grid-cols-[minmax(0,1fr)_96px] gap-x-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_96px]">
        <span role="columnheader" className="pb-2 text-[12px] text-muted">
          {t("Follow-up", "المتابعة")}
        </span>
        <div role="columnheader" dir="ltr" className="relative hidden h-7 sm:block" aria-label={t("Target date", "الموعد المستهدف")}>
          {ticks.filter((tick) => Math.abs(tick) > span / 9 && (tick - minDays) / span > 0.04 && (maxDays - tick) / span > 0.06).map((tick) => (
            <span
              key={tick}
              className="num absolute top-0 -translate-x-1/2 text-[12px] whitespace-nowrap text-muted"
              style={{ left: pos(tick) }}
            >
              {shortDate(addDaysIso(today, tick), lang)}
            </span>
          ))}
          <span
            className="absolute top-0 -translate-x-1/2 rounded-[4px] bg-surface px-1 text-[12px] font-medium whitespace-nowrap text-accent"
            style={{ left: pos(0) }}
          >
            {t("Today", "اليوم")}
          </span>
        </div>
        <span role="columnheader" className="pb-2 text-end text-[12px] text-muted">
          {t("Against target", "مقارنةً بالموعد")}
        </span>
      </div>

      {items.map((f) => {
        const late = f.days < 0;
        return (
          <div
            key={f.id}
            role="row"
            className="relative grid min-h-[48px] grid-cols-[minmax(0,1fr)_96px] items-center gap-x-4 border-t border-rule transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_96px]"
          >
            <div role="cell" className="min-w-0 py-1.5">
              <Link href={historyHref(f.codes)} className={cn("block truncate text-[14px] text-ink", STRETCH)} title={f.item}>
                {f.item}
              </Link>
              <p className="truncate text-[12px] text-muted">
                <span className="mono">{f.meetingId}</span> · {peopleLabel(f.people)}
              </p>
            </div>
            <div role="cell" dir="ltr" className="relative hidden h-full self-stretch sm:block" aria-label={t(`Target ${formatDate(f.targetDate, lang)}`, `الموعد المستهدف ${formatDate(f.targetDate, lang)}`)}>
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
                "num text-end text-[13px] whitespace-nowrap",
                late ? "font-medium text-risk" : f.days <= 7 ? "text-ink" : "text-muted",
              )}
            >
              {late
                ? t(`${plural(lang, -f.days, DAY)} late`, `${plural(lang, -f.days, DAY)} تأخير`)
                : f.days === 0
                  ? t("Due today", "مستحقة اليوم")
                  : t(`in ${plural(lang, f.days, DAY)}`, `بعد ${plural(lang, f.days, DAY)}`)}
              <span className="block text-[12px] font-normal text-muted">{shortDate(f.targetDate, lang)}</span>
            </p>
          </div>
        );
      })}
      {hidden > 0 ? (
        <p className="border-t border-rule pt-3 text-[13px] text-muted">
          {t(
            `${hidden} more open follow-up${hidden === 1 ? "" : "s"} with later targets`,
            `${plural(lang, hidden, FOLLOW_UP)} مفتوحة أخرى ذات مواعيد لاحقة`,
          )}{" "}
          ·{" "}
          <Link href="/follow-ups" className="font-medium text-ink hover:text-accent">
            {t(`Review all ${all.length}`, `مراجعة الكل ${all.length}`)}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/* ---------- View ---------- */

export async function DashboardView({ data }: { data: DashboardData }) {
  // HR can't open Meetings; send it to Analytics, which counts the same meetings.
  const meetingsHref = data.canMeetings ? "/meetings" : "/analytics";
  const t = await getT();
  const lang = await getLang();

  const finding = data.oldestLateItem
    ? t(
        `${plural(lang, data.overdueCount, FOLLOW_UP)} past target — the oldest, “${data.oldestLateItem.item}”, is ${plural(lang, data.oldestLate, DAY)} late.`,
        `${plural(lang, data.overdueCount, FOLLOW_UP)} بعد الموعد المستهدف، والأقدم منها “${data.oldestLateItem.item}” بتأخير ${plural(lang, data.oldestLate, DAY)}.`,
      )
    : data.open.length
      ? t(
          `Nothing is overdue. ${plural(lang, data.dueThisWeek, FOLLOW_UP)} due in the next 7 days.`,
          `لا يوجد شيء متأخر. ${plural(lang, data.dueThisWeek, FOLLOW_UP)} مستحقة خلال 7 أيام.`,
        )
      : t("No open follow-ups.", "لا توجد متابعات مفتوحة.");

  const maxConcern = Math.max(1, ...data.departments.map((d) => d.meetings));
  const totalTeam = data.feedback.reduce((a, m) => a + m.team, 0);
  const totalSubmitted = data.feedback.reduce((a, m) => a + m.submitted, 0);
  const meetingsDelta = data.meetingsLast30 - data.meetingsPrior30;

  return (
    <>
      <header className="page-head">
        <div className="min-w-0">
          <h1>{t("Overview", "نظرة عامة")}</h1>
          <p className={cn(data.overdueCount > 0 && "text-ink")}>{finding}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.canCreate ? (
            <Link
              href="/meetings"
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-line-2 bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <Plus className="size-4" strokeWidth={1.75} />
              {t("New meeting", "اجتماع جديد")}
            </Link>
          ) : null}
          <Link
            href="/follow-ups"
            className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-primary px-3.5 text-[13px] font-medium text-primary-ink transition-opacity hover:opacity-90"
          >
            {t("Review follow-ups", "مراجعة المتابعات")}
            <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      {/* KPI strip: one container, divided */}
      <section
        aria-label={t("Key figures", "المؤشرات الرئيسية")}
        className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-line lg:grid-cols-4 [&>*]:border-line [&>*]:px-5 [&>*]:py-4"
      >
        <Link href="/follow-ups?filter=Open" className="block border-e border-b transition-colors hover:bg-surface-2 lg:border-b-0">
          <KpiBody
            label={t("Open follow-ups", "المتابعات المفتوحة")}
            value={data.open.length}
            note={t(`${data.dueThisWeek} due in the next 7 days`, `${data.dueThisWeek} مستحقة خلال 7 أيام`)}
          />
        </Link>
        <Link href="/follow-ups?filter=Overdue" className="block border-b transition-colors hover:bg-surface-2 lg:border-e lg:border-b-0">
          <KpiBody
            label={t("Past target", "تجاوزت الموعد المستهدف")}
            value={data.overdueCount}
            tone={data.overdueCount > 0 ? "risk" : undefined}
            note={
              data.overdueCount
                ? t(
                    `oldest ${plural(lang, data.oldestLate, DAY)} late`,
                    `الأقدم بتأخير ${plural(lang, data.oldestLate, DAY)}`,
                  )
                : t("none late", "لا يوجد تأخير")
            }
          />
        </Link>
        <Link href={meetingsHref} className="block border-e transition-colors hover:bg-surface-2">
          <KpiBody
            label={t("Meetings, last 30 days", "الاجتماعات خلال آخر 30 يوماً")}
            value={data.meetingsLast30}
            note={
              data.meetingsPrior30 === 0 && data.meetingsLast30 > 0
                ? t(
                    `+${data.meetingsLast30} (none the 30 days before)`,
                    `+${data.meetingsLast30} (لا شيء في الـ30 يوماً السابقة)`,
                  )
                : t(
                    `${meetingsDelta > 0 ? "+" : ""}${meetingsDelta} vs the 30 days before`,
                    `${meetingsDelta > 0 ? "+" : ""}${meetingsDelta} مقارنةً بالـ30 يوماً السابقة`,
                  )
            }
          />
        </Link>
        <Link href={data.canAnalytics ? "/analytics" : "/employees"} className="block transition-colors hover:bg-surface-2">
          <KpiBody
            label={t("Average pulse, 90 days", "متوسط النبض خلال 90 يوماً")}
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
            note={t(`from ${plural(lang, data.pulseCount, REVIEW)}`, `من ${plural(lang, data.pulseCount, REVIEW)}`)}
          />
        </Link>
      </section>

      {/* Row 1: the due line and where concerns come from */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title={t("Follow-ups against target", "المتابعات مقابل الموعد المستهدف")}>
            <div className="flex items-center gap-4 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-risk" aria-hidden />
                {t("Past target", "تجاوزت الموعد")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-accent" aria-hidden />
                {t("Open", "مفتوحة")}
              </span>
            </div>
          </PanelHeader>
          <PanelBody>
            <DueLine items={data.open} today={data.today} t={t} lang={lang} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title={t("Concerns raised", "المخاوف المُثارة")}>
            <span className="text-[12px] text-muted">{t("Last 90 days", "آخر 90 يوماً")}</span>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-5">
            {data.departments.length ? (
              <ul className="flex flex-col">
                {data.departments.map((d) => (
                  <li key={d.department} className="relative border-t border-rule py-2.5 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={data.canAnalytics ? `/analytics?department=${encodeURIComponent(d.department)}` : "/meetings"}
                        className={cn("truncate text-[14px] text-ink hover:text-accent", STRETCH)}
                      >
                        {d.department}
                      </Link>
                      <span className="num text-[13px] whitespace-nowrap text-muted">
                        <b className={cn("font-medium", d.riskSignals > 0 ? "text-ink" : "text-muted")}>
                          {d.riskSignals}
                        </b>{" "}
                        {t("of", "من")} {plural(lang, d.meetings, MEETING)}
                      </span>
                    </div>
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <span
                        className="absolute inset-y-0 start-0 rounded-full bg-line-2"
                        style={{ width: `${(d.meetings / maxConcern) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 start-0 rounded-full bg-accent"
                        style={{ width: `${(d.riskSignals / maxConcern) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">{t("No meetings in the last 90 days.", "لا توجد اجتماعات خلال آخر 90 يوماً.")}</p>
            )}

            {data.riskThemes.length ? (
              <div className="rounded-[8px] bg-surface-2 px-4 py-3">
                <p className="text-[12px] text-muted">
                  {t("Recurring themes · keyword scan", "موضوعات متكررة · فحص بالكلمات المفتاحية")}
                  {data.canAnalytics ? (
                    <>
                      {" · "}
                      <Link href="/analytics" className="font-medium text-ink hover:text-accent">
                        {t("Analytics", "التحليلات")}
                      </Link>
                    </>
                  ) : null}
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {data.riskThemes.map((theme) => (
                    <li key={theme.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{theme.label}</span>
                      <span className="num whitespace-nowrap text-muted">{plural(lang, theme.mentions, MEETING)}</span>
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
          <PanelHeader title={t("Recent meetings", "الاجتماعات الأخيرة")}>
            <Link
              href={meetingsHref}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:text-accent"
            >
              {t(`All ${data.totalMeetings}`, `الكل ${data.totalMeetings}`)}
              <ArrowRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.75} />
            </Link>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="w-[92px]">{t("ID", "المعرّف")}</th>
                  <th className="w-[96px] text-end">{t("Date", "التاريخ")}</th>
                  <th>{t("Employees", "الموظفون")}</th>
                  <th className="w-[96px]">{t("Type", "النوع")}</th>
                  <th className="w-[72px] text-end">{t("Pulse", "النبض")}</th>
                  <th className="w-[96px] text-end">{t("Open items", "البنود المفتوحة")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      {t(
                        "No meetings recorded yet. ERCs add them from Meetings.",
                        "لم تُسجَّل اجتماعات بعد. يضيف فريق ERC الاجتماعات من صفحة الاجتماعات.",
                      )}
                    </td>
                  </tr>
                ) : null}
                {data.recent.map((m) => (
                  <tr key={m.id} className="relative" data-clickable="true">
                    <td className="mono whitespace-nowrap text-muted">
                      <Link
                        href={historyHref(m.codes)}
                        className={STRETCH}
                        aria-label={t(
                          `History of ${peopleLabel(m.people)} (${m.id})`,
                          `السجل الخاص بـ ${peopleLabel(m.people)} (${m.id})`,
                        )}
                      >
                        {m.id}
                      </Link>
                    </td>
                    <td className="num text-end whitespace-nowrap">{shortDate(m.date, lang)}</td>
                    <td className="min-w-0">
                      <span className="block truncate text-ink">{peopleLabel(m.people)}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {m.department} · {m.team}
                      </span>
                    </td>
                    <td className="text-muted">
                      {m.type === "Individual" ? t("Individual", "فردي") : m.type === "Group" ? t("Group", "جماعي") : m.type}
                    </td>
                    <td className="num text-end">
                      {m.pulse == null ? <span className="text-faint">—</span> : formatPulse(m.pulse)}
                    </td>
                    <td className="num text-end">
                      {m.openFollowups ? m.openFollowups : <span className="text-faint">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("Manager feedback", "ملاحظات المديرين")}>
            <span className="text-[12px] text-muted">{data.cycle}</span>
          </PanelHeader>
          <PanelBody>
            <p className="text-[13px] text-muted">
              <b className="num text-[20px] font-normal text-ink">{totalSubmitted}</b>
              <span className="num"> {t("of", "من")} {totalTeam}</span> {t("reviews submitted", "مراجعات مُرسلة")}
            </p>
            {data.feedback.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">
                {t(
                  "No managers with active teams in the directory yet.",
                  "لا يوجد مديرون لديهم فرق نشطة في الدليل بعد.",
                )}
              </p>
            ) : null}
            <ul className="mt-3 flex flex-col">
              {data.feedback.map((m) => {
                const pct = m.team ? m.submitted / m.team : 0;
                return (
                  <li key={m.code} className="relative border-t border-rule py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      {data.canFeedback ? (
                        <Link
                          href={`/feedback?mgr=${encodeURIComponent(m.code)}`}
                          className={cn("min-w-0 truncate text-[14px] text-ink hover:text-accent", STRETCH)}
                        >
                          {m.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate text-[14px] text-ink">{m.name}</span>
                      )}
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
