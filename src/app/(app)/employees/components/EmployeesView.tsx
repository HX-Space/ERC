"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useT } from "@/components/i18n/lang";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { RichTextView } from "@/components/ui/rich-text";
import { avgPulse, formatPulse, trendOf } from "@/lib/pulse";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/followups";
import { OUTCOME_SECTIONS } from "@/lib/constants";
import type {
  EmployeeRecord,
  FollowupRecord,
  ManagerFeedbackRecord,
  MeetingRecord,
} from "@/types";
import { PulseStats } from "./PulseStats";

export function EmployeesView({
  employees,
  departments,
  titles,
  selectedCode,
  meetings,
  feedback,
  followups,
}: {
  employees: EmployeeRecord[];
  departments: string[];
  titles: string[];
  selectedCode: string;
  meetings: MeetingRecord[];
  feedback: ManagerFeedbackRecord[];
  followups: FollowupRecord[];
  canClose: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);
  const lang = useLang();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [title, setTitle] = useState("");
  const [hasOnly, setHasOnly] = useState(false);

  const selected = employees.find((e) => e.code === selectedCode) ?? employees[0];

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (dept && e.department !== dept) return false;
      if (title && e.title !== title) return false;
      if (q.trim()) {
        const hay = `${e.name} ${e.code}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [employees, dept, title, q]);

  const pulseMeetings = meetings.filter(
    (m) => m.meetingType === "Individual" && m.pulse && avgPulse(m.pulse) != null,
  );
  const avgs = pulseMeetings.map((m) => avgPulse(m.pulse)!);
  const hist = avgs.length
    ? avgs.reduce((a, b) => a + b, 0) / avgs.length
    : null;
  const trend = trendOf(avgs);

  const timeline = [
    ...meetings.map((m) => ({ d: m.meetingDate, k: "m" as const, m })),
    ...feedback.map((f) => ({ d: f.feedbackDate, k: "f" as const, f })),
  ].sort((a, b) => b.d.localeCompare(a.d));

  function pick(code: string) {
    router.push(`/employees?code=${code}`);
  }

  if (!selected) {
    return <p className="text-muted">{t("No employees in directory.", "لا يوجد موظفون في الدليل.")}</p>;
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("History", "السجل")}</h1>
          <p>
            {t(
              "Find an employee and review meetings, pulse, and feedback on file.",
              "ابحث عن موظف وراجع الاجتماعات والنبض والملاحظات المسجلة لديه.",
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="sticky top-4 max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          <div className="space-y-3 border-b border-line p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("Search", "بحث")}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("e.g. Aya or E1008", "مثال: Aya أو E1008")}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{t("Department", "القسم")}</span>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="rounded-lg border border-line-2 px-2 py-2 outline-none"
                >
                  <option value="">{t("All", "الكل")}</option>
                  {departments.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{t("Job title", "المسمى الوظيفي")}</span>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg border border-line-2 px-2 py-2 outline-none"
                >
                  <option value="">{t("All", "الكل")}</option>
                  {titles.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={hasOnly}
                onChange={(e) => setHasOnly(e.target.checked)}
              />
              {t(
                "Only employees with records (client filter hint)",
                "الموظفون الذين لديهم سجلات فقط (تلميح تصفية)",
              )}
            </label>
            <div className="text-xs text-faint">
              {t(
                `${filtered.length} of ${employees.length} employees`,
                `${filtered.length} من ${employees.length} موظفًا`,
              )}
            </div>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto p-2">
            {filtered.map((e) => (
              <li key={e.code}>
                <button
                  type="button"
                  aria-label={t(`Select ${e.name}`, `اختيار ${e.name}`)}
                  aria-current={e.code === selected.code ? "true" : undefined}
                  className={`flex w-full cursor-pointer flex-col rounded-lg px-3 py-2 text-start outline-none hover:bg-surface-2 ${
                    e.code === selected.code ? "bg-accent-soft text-accent" : ""
                  }`}
                  onClick={() => pick(e.code)}
                >
                  <span className="font-medium">
                    {e.name}
                    {e.status !== "Active" ? (
                      <span className="text-faint"> ({t("inactive", "غير نشط")})</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted">
                    {e.title} · {e.team}
                  </span>
                  <span className="mono text-[11px] text-faint">{e.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-4 min-w-0">
          <Panel>
            <PanelBody>
              <h2 className="text-xl">
                {selected.name}{" "}
                <span className="mono text-base text-faint">{selected.code}</span>
              </h2>
              <div className="mt-1 font-medium">{selected.title}</div>
              <div className="text-muted">
                {selected.department} · {selected.unit} · {selected.team} ·
                {" "}{t("Manager:", "المدير:")} {selected.managerName}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={selected.status === "Active" ? "ok" : "mute"}>
                  {selected.status === "Active"
                    ? t("Active", "نشط")
                    : selected.status === "Inactive"
                      ? t("Inactive", "غير نشط")
                      : selected.status}
                </Pill>
                <span className="inline-flex items-center rounded-[5px] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {meetings.length} {t("ER meetings", "اجتماعات علاقات الموظفين")}
                </span>
                <span className="inline-flex items-center rounded-[5px] bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {feedback.length} {t("manager feedback", "ملاحظات المدير")}
                </span>
                <PulseStats
                  current={formatPulse(avgs.at(-1))}
                  average={formatPulse(hist)}
                  trend={trend}
                />
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title={t("History", "السجل")} />
            <PanelBody>
              {timeline.length ? (
                <div className="divide-y divide-line">
                  {timeline.map((item) =>
                    item.k === "m" ? (
                      <div
                        key={item.m.id}
                        className="grid gap-3 py-4 md:grid-cols-[92px_minmax(0,1fr)]"
                      >
                        <div className="mono text-xs text-muted">
                          {fmtDate(item.m.meetingDate)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{t("ER meeting", "اجتماع علاقات الموظفين")}</b>
                            <span className="mono text-ai">{item.m.id}</span>
                            <span className="rounded bg-surface-2 px-2 text-xs">
                              {item.m.meetingType === "Group"
                                ? t("Group", "جماعي")
                                : item.m.meetingType === "Individual"
                                  ? t("Individual", "فردي")
                                  : item.m.meetingType}
                            </span>
                          </div>
                          <dl className="mt-2 grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] text-sm">
                            {OUTCOME_SECTIONS.map((sec) => {
                              if (!item.m[sec.key]) return null;
                              return (
                                <div key={sec.key} className="contents">
                                  <dt className="text-xs font-semibold text-muted">
                                    {lang === "ar" ? sec.labelAr : sec.label}
                                  </dt>
                                  <dd className="m-0"><RichTextView value={item.m.outcomeHtml[sec.key]} /></dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.f.id}
                        className="grid gap-3 py-4 md:grid-cols-[92px_minmax(0,1fr)]"
                      >
                        <div className="mono text-xs text-muted">
                          {fmtDate(item.f.feedbackDate)}
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <b>{t("Manager feedback", "ملاحظات المدير")}</b>
                            <span className="rounded bg-surface-2 px-2 text-xs">
                              {item.f.mode === "voice"
                                ? t("voice", "صوتية")
                                : item.f.mode === "written"
                                  ? t("written", "مكتوبة")
                                  : item.f.mode}
                            </span>
                            <span className="rounded bg-surface-2 px-2 text-xs">
                              {item.f.cycle}
                            </span>
                          </div>
                          <blockquote
                            className="mt-2 border-s-2 border-line-2 ps-3 whitespace-pre-wrap"
                            dir="auto"
                          >
                            {item.f.body}
                          </blockquote>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-muted">{t("No meetings or feedback yet.", "لا توجد اجتماعات أو ملاحظات بعد.")}</p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title={t("Follow-up history", "سجل المتابعات")} />
            <PanelBody>
              {followups.length ? (
                <ul className="space-y-2">
                  {followups.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Pill
                        tone={
                          f.status === "Closed"
                            ? "ok"
                            : isOverdue(f)
                              ? "risk"
                              : "info"
                        }
                      >
                        {f.status === "Closed"
                          ? t("Closed", "مغلقة")
                          : isOverdue(f)
                            ? t("Overdue", "متأخرة")
                            : t("Open", "مفتوحة")}
                      </Pill>
                      {f.item}
                      <span className="mono text-xs text-faint">
                        {fmtDate(f.targetDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">{t("No follow-ups.", "لا توجد متابعات.")}</p>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}
