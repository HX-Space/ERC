"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
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

  const openFollowups = followups.filter((f) => f.status === "Open");
  const attention = [
    ...followups.filter((f) => isOverdue(f)).slice(0, 3).map((f) => ({
      tone: "risk" as const,
      label: "Overdue",
      text: f.item,
      date: f.targetDate,
    })),
    ...followups
      .filter((f) => f.status === "Open" && !isOverdue(f))
      .slice(0, 2)
      .map((f) => ({
        tone: "info" as const,
        label: "Due soon",
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
          <h1>Meetings</h1>
          <p>
            {meetings.length} recorded · {openFollowups.length} open follow-ups
            {overdueCount ? ` · ${overdueCount} overdue` : ""}
          </p>
        </div>
        {canCreate ? (
          <Button
            variant="primary"
            aria-label="Create new meeting"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-5" />
            New meeting
          </Button>
        ) : null}
      </header>

      <Panel>
        <PanelHeader title="Needs attention" />
        <PanelBody>
          {attention.length ? (
            <ul className="space-y-2">
              {attention.map((item, i) => (
                <li key={`${item.text}-${i}`} className="flex flex-wrap items-center gap-2">
                  <Pill tone={item.tone}>{item.label}</Pill>
                  <span>{item.text}</span>
                  <span className="mono text-xs text-faint">{formatDate(item.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Nothing overdue or due soon.</p>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Meeting history">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, team or ID"
            aria-label="Search meetings"
            className="field-control max-w-[260px] rounded-lg outline-none"
          />
        </PanelHeader>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Employee(s)</th>
                <th>Type</th>
                <th>Pulse</th>
                <th>Status</th>
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
                      <td className="mono">{formatDate(m.meetingDate)}</td>
                      <td>
                        <div className="font-medium">
                          {(m.employeeNames ?? []).join(", ")}
                        </div>
                        <div className="text-xs text-faint">
                          {m.department} · {m.team}
                        </div>
                      </td>
                      <td>
                        {m.meetingType}
                        <div className="mt-0.5">
                          <MeetingChannelMark channel={m.channel} />
                        </div>
                      </td>
                      <td className="mono">
                        {m.meetingType === "Group"
                          ? "n/a"
                          : formatPulse(avgPulse(m.pulse))}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {m.risk ? <Pill tone="warn">Risk</Pill> : null}
                          {open ? (
                            <Pill
                              tone={
                                fus.some((f) => isOverdue(f)) ? "risk" : "info"
                              }
                            >
                              {open} open
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
                    No meetings match that search.
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
