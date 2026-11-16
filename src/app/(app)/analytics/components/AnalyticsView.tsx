"use client";

import { useEffect, useMemo, useState } from "react";
import { analyticsInsightsAction } from "@/app/actions/ai";
import { useLang, useT } from "@/components/i18n/lang";
import { Kpi } from "@/components/ui/kpi";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import type { AnalyticsInsights } from "@/lib/ai-server";
import { isOverdue } from "@/lib/followups";
import { addDaysIso, formatDate, todayIso } from "@/lib/format";
import type { T } from "@/lib/i18n";
import type { EmployeeRecord, FollowupRecord, MeetingRecord } from "@/types";

function meetingsWord(n: number, t: T) {
  return t(
    n === 1 ? "meeting" : "meetings",
    n === 1 ? "اجتماع" : n === 2 ? "اجتماعان" : n <= 10 ? "اجتماعات" : "اجتماعًا",
  );
}

function typeLabel(v: string, t: T) {
  return v === "Individual" ? t("Individual", "فردي") : v === "Group" ? t("Group", "جماعي") : v;
}

export function AnalyticsView({
  meetings,
  followups,
  employees,
  departments,
  initialDepartment = "",
}: {
  meetings: MeetingRecord[];
  followups: FollowupRecord[];
  employees: EmployeeRecord[];
  departments: string[];
  initialDepartment?: string;
}) {
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);
  const [dept, setDept] = useState(initialDepartment);
  const [from, setFrom] = useState(() => addDaysIso(todayIso(), -365));
  const [to, setTo] = useState(todayIso());
  const [type, setType] = useState("");

  const empByCode = useMemo(() => {
    const map = new Map(employees.map((e) => [e.code, e]));
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      if (m.meetingDate < from || m.meetingDate > to) return false;
      if (type && m.meetingType !== type) return false;
      if (dept) {
        const ok = m.employeeCodes.some(
          (c) => empByCode.get(c)?.department === dept,
        );
        if (!ok) return false;
      }
      return true;
    });
  }, [meetings, from, to, type, dept, empByCode]);

  const ids = new Set(filtered.map((m) => m.id));
  const fus = followups.filter((f) => ids.has(f.meetingId));
  const met = new Set(filtered.flatMap((m) => m.employeeCodes));
  const risks = filtered.reduce(
    (a, m) => a + (m.risk ? m.risk.split(/(?<=[.!?])/).filter(Boolean).length : 0),
    0,
  );
  const open = fus.filter((f) => f.status === "Open").length;
  const closed = fus.filter((f) => f.status === "Closed").length;
  const od = fus.filter((f) => isOverdue(f)).length;

  const byDept: Record<string, { i: number; g: number }> = {};
  filtered.forEach((m) => {
    const ds = [
      ...new Set(
        m.employeeCodes.map((c) => empByCode.get(c)?.department).filter(Boolean),
      ),
    ] as string[];
    ds.forEach((d) => {
      byDept[d] ||= { i: 0, g: 0 };
      byDept[d][m.meetingType === "Group" ? "g" : "i"]++;
    });
  });
  const maxDept = Math.max(
    1,
    ...Object.values(byDept).map((v) => v.i + v.g),
  );

  // Insights for exactly this selection, from the server (OpenAI or the local engine).
  const selectionKey = filtered.map((m) => m.id).join(",");
  const [insights, setInsights] = useState<{
    key: string;
    data: AnalyticsInsights;
    source: "openai" | "local";
    model: string;
    notice?: string;
  } | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(async () => {
      const result = await analyticsInsightsAction(selectionKey ? selectionKey.split(",") : []);
      if (!live) return;
      if (!result.ok) {
        setInsightError(result.error);
        return;
      }
      setInsightError(null);
      setInsights({
        key: selectionKey,
        data: result.insights,
        source: result.source,
        model: result.model,
        notice: result.notice,
      });
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [selectionKey]);
  const insightsReady = insights?.key === selectionKey ? insights : null;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("Analytics", "التحليلات")}</h1>
          <p>
            {t(
              "Activity, concerns, and development signals across the organisation.",
              "مؤشرات النشاط والمخاوف وتطوير الموظفين على مستوى المؤسسة.",
            )}
          </p>
        </div>
        <Pill tone="mute">
          {t("Data through", "البيانات حتى")} {fmtDate(todayIso())}
        </Pill>
      </header>

      <Panel>
        <PanelBody>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("Department", "القسم")}</span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                <option value="">{t("All", "الكل")}</option>
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("From", "من")}</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("To", "إلى")}</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t("Meeting type", "نوع الاجتماع")}</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                <option value="">{t("All", "الكل")}</option>
                <option value="Individual">{t("Individual", "فردي")}</option>
                <option value="Group">{t("Group", "جماعي")}</option>
              </select>
            </label>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label={t("Total meetings", "إجمالي الاجتماعات")} value={filtered.length} />
        <Kpi label={t("Employees met", "الموظفون الذين تمت مقابلتهم")} value={met.size} />
        <Kpi label={t("Identified risks", "المخاطر المحددة")} value={risks} tone="warn" />
        <Kpi label={t("Open follow-ups", "المتابعات المفتوحة")} value={open} />
        <Kpi label={t("Closed follow-ups", "المتابعات المغلقة")} value={closed} />
        <Kpi label={t("Overdue follow-ups", "المتابعات المتأخرة")} value={od} tone="risk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t("Meetings by department", "الاجتماعات حسب القسم")} />
          <PanelBody className="space-y-3">
            {Object.keys(byDept).length ? (
              Object.keys(byDept)
                .sort()
                .map((d) => {
                  const v = byDept[d];
                  return (
                    <div
                      key={d}
                      className="grid grid-cols-[110px_minmax(0,1fr)_28px] items-center gap-2 text-sm"
                    >
                      <span>{d}</span>
                      <div className="flex h-2.5 overflow-hidden rounded bg-surface-2">
                        <i
                          className="block h-full bg-accent"
                          style={{ width: `${(v.i / maxDept) * 100}%` }}
                        />
                        <i
                          className="block h-full bg-info"
                          style={{ width: `${(v.g / maxDept) * 100}%` }}
                        />
                      </div>
                      <span className="mono text-end">{v.i + v.g}</span>
                    </div>
                  );
                })
            ) : (
              <p className="text-muted">{t("No meetings match these filters.", "لا توجد اجتماعات تطابق هذه الفلاتر.")}</p>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title={t("Follow-up status", "حالة المتابعات")} />
          <PanelBody>
            <div className="flex h-3.5 overflow-hidden rounded-full bg-surface-2">
              <i
                className="block h-full bg-ok"
                style={{ width: `${(closed / Math.max(1, fus.length)) * 100}%` }}
              />
              <i
                className="block h-full bg-info"
                style={{
                  width: `${((open - od) / Math.max(1, fus.length)) * 100}%`,
                }}
              />
              <i
                className="block h-full bg-risk"
                style={{ width: `${(od / Math.max(1, fus.length)) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span>{t("Closed", "مغلقة")} {closed}</span>
              <span>{t("Open on time", "مفتوحة في الموعد")} {open - od}</span>
              <span>{t("Overdue", "متأخرة")} {od}</span>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={
            <span className="flex items-center gap-2">
              {t("AI management insights", "رؤى الإدارة بالذكاء الاصطناعي")}
              {insightsReady ? (
                <Pill tone="ai">
                  {insightsReady.source === "openai" ? insightsReady.model : t("Local engine", "المحرك المحلي")}
                </Pill>
              ) : null}
            </span>
          }
        >
          <span className="text-[12px] text-muted">
            {insightsReady
              ? t(
                  `${filtered.length} meetings in this selection`,
                  `${filtered.length} اجتماعات في هذا التحديد`,
                )
              : insightError
                ? ""
                : t("Analysing…", "جارٍ التحليل…")}
          </span>
        </PanelHeader>
        <PanelBody>
          {insightError ? (
            <p className="text-[14px] text-risk">{insightError}</p>
          ) : !insightsReady ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-4 w-1/2 rounded bg-surface-2" />
              <div className="h-4 w-3/5 rounded bg-surface-2" />
            </div>
          ) : (
            <>
              <p className="max-w-3xl text-[14px] text-ink" dir="auto">
                {insightsReady.data.summary}
              </p>
              {insightsReady.notice ? (
                <p className="mt-1 text-[12px] text-muted">{insightsReady.notice}</p>
              ) : null}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Insight
                  title={t("Top recurring issues", "أبرز المشكلات المتكررة")}
                  items={insightsReady.data.issues.map((iss) => (
                    <li key={iss.label}>
                      <b>{iss.label}</b> · {iss.meetingIds.length} {meetingsWord(iss.meetingIds.length, t)}
                      <div className="text-faint text-xs">{iss.teams.join(", ")}</div>
                    </li>
                  ))}
                />
                <Insight
                  title={t("Positive trends", "الاتجاهات الإيجابية")}
                  items={insightsReady.data.positives.map((pos) => (
                    <li key={pos.label}>
                      <b>{pos.label}</b> · {pos.meetingIds.length} {meetingsWord(pos.meetingIds.length, t)}
                    </li>
                  ))}
                />
                <Insight
                  title={t("Recommended actions", "الإجراءات الموصى بها")}
                  items={insightsReady.data.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                />
              </div>
            </>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={t("Meeting history", "سجل الاجتماعات")} />
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">{t("ID", "المعرّف")}</th>
                <th className="px-3 py-2">{t("Date", "التاريخ")}</th>
                <th className="px-3 py-2">{t("Employee(s)", "الموظف/الموظفون")}</th>
                <th className="px-3 py-2">{t("Type", "النوع")}</th>
                <th className="px-3 py-2">{t("Risks", "المخاطر")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice()
                .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                .map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="mono px-3 py-2">{m.id}</td>
                    <td className="mono px-3 py-2">{fmtDate(m.meetingDate)}</td>
                    <td className="px-3 py-2">
                      {(m.employeeNames ?? []).join(", ")}
                    </td>
                    <td className="px-3 py-2">{typeLabel(m.meetingType, t)}</td>
                    <td className="px-3 py-2">
                      {m.risk ? <Pill tone="warn">{t("Noted", "تم التسجيل")}</Pill> : "–"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Insight({
  title,
  items,
}: {
  title: string;
  items: React.ReactNode[];
}) {
  const t = useT();
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="space-y-2 text-sm">{items}</ul>
      ) : (
        <p className="text-faint text-sm">{t("Nothing in this selection.", "لا شيء في هذا التحديد.")}</p>
      )}
    </div>
  );
}
