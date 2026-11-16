"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useLang, useT } from "@/components/i18n/lang";
import { Button } from "@/components/ui/button";
import { MeetingChannelMark } from "@/components/ui/meeting-channel";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { formatDate } from "@/lib/format";
import { avgPulse, formatPulse } from "@/lib/pulse";
import { isOverdue } from "@/lib/followups";
import type { EmployeeRecord, FollowupRecord, MeetingRecord } from "@/types";
import { MeetingDrawer } from "./MeetingDrawer";
import { MeetingFormDrawer } from "./MeetingFormDrawer";

export function MeetingsView({
  meetings,
  followups,
  employees,
  canCreate,
  overdueCount,
}: {
  meetings: MeetingRecord[];
  followups: FollowupRecord[];
  employees: EmployeeRecord[];
  canCreate: boolean;
  overdueCount: number;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);

  const openFollowups = followups.filter((f) => f.status === "Open");
  const attention = [
    ...followups.filter((f) => isOverdue(f)).slice(0, 3).map((f) => ({
      tone: "risk" as const,
      label: t("Overdue", "متأخر"),
      text: f.item,
      date: f.targetDate,
    })),
    ...followups
      .filter((f) => f.status === "Open" && !isOverdue(f))
      .slice(0, 2)
      .map((f) => ({
        tone: "info" as const,
        label: t("Due soon", "مستحق قريباً"),
        text: f.item,
        date: f.targetDate,
      })),
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter((m) =>
      [m.id, m.department, m.team, ...(m.employeeNames ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [meetings, query]);

  const selected = meetings.find((m) => m.id === selectedId) ?? null;
  const selectedFus = followups.filter((f) => f.meetingId === selectedId);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("Meetings", "الاجتماعات")}</h1>
          <p>
            {t(
              `${meetings.length} recorded · ${openFollowups.length} open follow-ups${overdueCount ? ` · ${overdueCount} overdue` : ""}`,
              `${meetings.length} مُسجَّل · ${openFollowups.length} متابعة مفتوحة${overdueCount ? ` · ${overdueCount} متأخرة` : ""}`,
            )}
          </p>
        </div>
        {canCreate ? (
          <Button
            variant="primary"
            aria-label={t("Create new meeting", "إنشاء اجتماع جديد")}
            onClick={() => setCreating(true)}
          >
            <Plus className="size-5" />
            {t("New meeting", "اجتماع جديد")}
          </Button>
        ) : null}
      </header>

      <Panel>
        <PanelHeader title={t("Needs attention", "يتطلب الانتباه")} />
        <PanelBody>
          {attention.length ? (
            <ul className="space-y-2">
              {attention.map((item, i) => (
                <li key={`${item.text}-${i}`} className="flex flex-wrap items-center gap-2">
                  <Pill tone={item.tone}>{item.label}</Pill>
                  <span>{item.text}</span>
                  <span className="mono text-xs text-faint">{fmtDate(item.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("Nothing overdue or due soon.", "لا يوجد متأخر أو مستحق قريباً.")}</p>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={t("Meeting history", "سجل الاجتماعات")}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by name, team or ID", "ابحث بالاسم أو الفريق أو المعرّف")}
            aria-label={t("Search meetings", "البحث في الاجتماعات")}
            className="field-control max-w-[260px] rounded-lg outline-none"
          />
        </PanelHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("ID", "المعرّف")}</th>
                <th>{t("Date", "التاريخ")}</th>
                <th>{t("Employee(s)", "الموظف/الموظفون")}</th>
                <th>{t("Type", "النوع")}</th>
                <th>{t("Pulse", "النبض")}</th>
                <th>{t("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((m) => {
                  const fus = followups.filter((f) => f.meetingId === m.id);
                  const open = fus.filter((f) => f.status === "Open").length;
                  return (
                    <tr
                      key={m.id}
                      data-clickable="true"
                      onClick={() => setSelectedId(m.id)}
                    >
                      <td className="mono">{m.id}</td>
                      <td className="mono">{fmtDate(m.meetingDate)}</td>
                      <td>
                        <div className="font-medium">
                          {(m.employeeNames ?? []).join(", ")}
                        </div>
                        <div className="text-xs text-faint">
                          {m.department} · {m.team}
                        </div>
                      </td>
                      <td>
                        {m.meetingType === "Group" ? t("Group", "جماعي") : t("Individual", "فردي")}
                        <div className="mt-0.5">
                          <MeetingChannelMark lang={uiLang} channel={m.channel} />
                        </div>
                      </td>
                      <td className="mono">
                        {m.meetingType === "Group"
                          ? t("n/a", "لا ينطبق")
                          : formatPulse(avgPulse(m.pulse))}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {m.risk ? <Pill tone="warn">{t("Risk", "خطر")}</Pill> : null}
                          {open ? (
                            <Pill
                              tone={
                                fus.some((f) => isOverdue(f)) ? "risk" : "info"
                              }
                            >
                              {open} {t("open", "مفتوح")}
                            </Pill>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    {t("No meetings match that search.", "لا توجد اجتماعات تطابق البحث.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <MeetingDrawer
        meeting={selected}
        followups={selectedFus}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      />
      <MeetingFormDrawer
        open={creating}
        employees={employees}
        onClose={() => setCreating(false)}
      />
    </>
  );
}
