"use client";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MeetingChannelMark } from "@/components/ui/meeting-channel";
import { Pill } from "@/components/ui/pill";
import { OUTCOME_SECTIONS, PULSE_INDICATORS, PULSE_SCALE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { avgPulse, formatPulse } from "@/lib/pulse";
import { isOverdue } from "@/lib/followups";
import type { FollowupRecord, MeetingRecord } from "@/types";

export function MeetingDrawer({
  meeting,
  followups,
  open,
  onClose,
}: {
  meeting: MeetingRecord | null;
  followups: FollowupRecord[];
  open: boolean;
  onClose: () => void;
}) {
  if (!meeting) {
    return <Drawer open={false} title="Meeting" onClose={onClose}>{null}</Drawer>;
  }

  const pulseAvg = avgPulse(meeting.pulse);

  return (
    <Drawer
      open={open}
      title={`Meeting ${meeting.id}`}
      onClose={onClose}
      footer={
        <Button aria-label="Close meeting detail" onClick={onClose}>
          Close
        </Button>
      }
    >
      <section className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base">{(meeting.employeeNames ?? []).join(", ")}</h3>
            <p className="text-sm text-muted">
              {meeting.department} · {meeting.unit} · {meeting.team}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {meeting.meetingType}
            </span>
            <span className="inline-flex items-center rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
              <MeetingChannelMark channel={meeting.channel} className="text-muted" />
            </span>
          </div>
        </div>
        <p className="mono text-xs text-muted">
          Met {formatDate(meeting.meetingDate)} · report created{" "}
          {formatDate(meeting.createdAt)}
        </p>
      </section>

      {meeting.aiSummary ? (
        <section className="space-y-2 rounded-[var(--radius)] border border-ai bg-ai-soft p-4">
          <div className="flex items-center gap-2 font-semibold text-ai">
            AI summary <Pill tone="ai">Accepted by ER</Pill>
          </div>
          <p className="m-0" dir="auto">{meeting.aiSummary}</p>
        </section>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">Meeting outcomes</h3>
        <dl className="grid gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          {OUTCOME_SECTIONS.map((sec) => {
            const value = meeting[sec.key];
            if (!value) return null;
            return (
              <div key={sec.key} className="contents">
                <dt className="text-xs font-semibold text-muted">{sec.label}</dt>
                <dd className="m-0 whitespace-pre-wrap">{value}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      {meeting.pulse ? (
        <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm">Employee Pulse Review</h3>
            <div className="text-right">
              <div className="text-xs text-muted">Meeting pulse</div>
              <b className="font-[family-name:var(--font-display)] text-2xl">
                {formatPulse(pulseAvg)}
              </b>
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {PULSE_INDICATORS.map((ind) => {
                const v = meeting.pulse?.[ind.key];
                return (
                  <tr key={ind.key} className="border-b border-line last:border-0">
                    <td className="py-2">{ind.label}</td>
                    <td className="mono py-2">{v === "NO" ? "N/O" : v ?? "–"}</td>
                    <td className="py-2 text-muted">
                      {typeof v === "number" ? PULSE_SCALE[v] : v === "NO" ? "Not Observed" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {meeting.pulseNote ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              {meeting.pulseNote}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">Follow-ups</h3>
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
                  {f.status === "Closed" ? "Closed" : isOverdue(f) ? "Overdue" : "Open"}
                </Pill>
                <span>{f.item}</span>
                <span className="mono text-xs text-faint">{formatDate(f.targetDate)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-faint">No follow-ups for this meeting.</p>
        )}
      </section>
    </Drawer>
  );
}
