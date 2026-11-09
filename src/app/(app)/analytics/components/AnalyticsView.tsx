"use client";

import { useEffect, useMemo, useState } from "react";
import { analyticsInsightsAction } from "@/app/actions/ai";
import { Kpi } from "@/components/ui/kpi";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import type { AnalyticsInsights } from "@/lib/ai-server";
import { isOverdue } from "@/lib/followups";
import { addDaysIso, formatDate, todayIso } from "@/lib/format";
import type { EmployeeRecord, FollowupRecord, MeetingRecord } from "@/types";

export function AnalyticsView({
  meetings,
  followups,
  employees,
  departments,
}: {
  meetings: MeetingRecord[];
  followups: FollowupRecord[];
  employees: EmployeeRecord[];
  departments: string[];
}) {
  const [dept, setDept] = useState("");
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
          <h1>Analytics</h1>
          <p>Activity, concerns, and development signals across the organisation.</p>
        </div>
        <Pill tone="mute">Data through {formatDate(todayIso())}</Pill>
      </header>

      <Panel>
        <PanelBody>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">Department</span>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">Meeting type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                <option value="">All</option>
                <option>Individual</option>
                <option>Group</option>
              </select>
            </label>
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label="Total meetings" value={filtered.length} />
        <Kpi label="Employees met" value={met.size} />
        <Kpi label="Identified risks" value={risks} tone="warn" />
        <Kpi label="Open follow-ups" value={open} />
        <Kpi label="Closed follow-ups" value={closed} />
        <Kpi label="Overdue follow-ups" value={od} tone="risk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Meetings by department" />
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
                      <span className="mono text-right">{v.i + v.g}</span>
                    </div>
                  );
                })
            ) : (
              <p className="text-muted">No meetings match these filters.</p>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Follow-up status" />
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
              <span>Closed {closed}</span>
              <span>Open on time {open - od}</span>
              <span>Overdue {od}</span>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={
            <span className="flex items-center gap-2">
              AI management insights
              {insightsReady ? (
                <Pill tone="ai">{insightsReady.source === "openai" ? insightsReady.model : "Local engine"}</Pill>
              ) : null}
            </span>
          }
        >
          <span className="text-[12px] text-muted">
            {insightsReady ? `${filtered.length} meetings in this selection` : insightError ? "" : "Analysing…"}
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
                  title="Top recurring issues"
                  items={insightsReady.data.issues.map((t) => (
                    <li key={t.label}>
                      <b>{t.label}</b> · {t.meetingIds.length} meeting{t.meetingIds.length === 1 ? "" : "s"}
                      <div className="text-faint text-xs">{t.teams.join(", ")}</div>
                    </li>
                  ))}
                />
                <Insight
                  title="Positive trends"
                  items={insightsReady.data.positives.map((t) => (
                    <li key={t.label}>
                      <b>{t.label}</b> · {t.meetingIds.length} meeting{t.meetingIds.length === 1 ? "" : "s"}
                    </li>
                  ))}
                />
                <Insight
                  title="Recommended actions"
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
        <PanelHeader title="Meeting history" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Employee(s)</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Risks</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice()
                .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                .map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="mono px-3 py-2">{m.id}</td>
                    <td className="mono px-3 py-2">{formatDate(m.meetingDate)}</td>
                    <td className="px-3 py-2">
                      {(m.employeeNames ?? []).join(", ")}
                    </td>
                    <td className="px-3 py-2">{m.meetingType}</td>
                    <td className="px-3 py-2">
                      {m.risk ? <Pill tone="warn">Noted</Pill> : "–"}
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
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="space-y-2 text-sm">{items}</ul>
      ) : (
        <p className="text-faint text-sm">Nothing in this selection.</p>
      )}
    </div>
  );
}
