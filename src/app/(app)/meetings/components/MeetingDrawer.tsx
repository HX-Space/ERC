"use client";

import { useLang, useT } from "@/components/i18n/lang";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MeetingChannelMark } from "@/components/ui/meeting-channel";
import { Pill } from "@/components/ui/pill";
import { RichTextView } from "@/components/ui/rich-text";
import { OUTCOME_SECTIONS, PULSE_INDICATORS, PULSE_SCALE, PULSE_SCALE_AR } from "@/lib/constants";
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
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);

  if (!meeting) {
    return <Drawer open={false} title={t("Meeting", "الاجتماع")} onClose={onClose}>{null}</Drawer>;
  }

  const pulseAvg = avgPulse(meeting.pulse);

  return (
    <Drawer
      open={open}
      title={t(`Meeting ${meeting.id}`, `الاجتماع ${meeting.id}`)}
      onClose={onClose}
      footer={
        <Button aria-label={t("Close meeting detail", "إغلاق تفاصيل الاجتماع")} onClick={onClose}>
          {t("Close", "إغلاق")}
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
              {meeting.meetingType === "Group" ? t("Group", "جماعي") : t("Individual", "فردي")}
            </span>
            <span className="inline-flex items-center rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
              <MeetingChannelMark lang={uiLang} channel={meeting.channel} className="text-muted" />
            </span>
          </div>
        </div>
        <p className="mono text-xs text-muted">
          {t(
            `Met ${fmtDate(meeting.meetingDate)} · report created ${fmtDate(meeting.createdAt)}`,
            `انعقد في ${fmtDate(meeting.meetingDate)} · أُنشئ التقرير ${fmtDate(meeting.createdAt)}`,
          )}
        </p>
      </section>

      {meeting.aiSummary ? (
        <section className="space-y-2 rounded-[var(--radius)] border border-ai bg-ai-soft p-4">
          <div className="flex items-center gap-2 font-semibold text-ai">
            {t("AI summary", "ملخص الذكاء الاصطناعي")} <Pill tone="ai">{t("Accepted by ERC", "اعتمده ERC")}</Pill>
          </div>
          <p className="m-0" dir="auto">{meeting.aiSummary}</p>
        </section>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">{t("Meeting outcomes", "مخرجات الاجتماع")}</h3>
        <dl className="grid gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          {OUTCOME_SECTIONS.map((sec) => {
            if (!meeting[sec.key]) return null;
            return (
              <div key={sec.key} className="contents">
                <dt className="text-xs font-semibold text-muted">{t(sec.label, sec.labelAr)}</dt>
                <dd className="m-0"><RichTextView value={meeting.outcomeHtml[sec.key]} /></dd>
              </div>
            );
          })}
        </dl>
      </section>

      {meeting.pulse ? (
        <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm">{t("Employee Pulse Review", "مراجعة النبض للموظف")}</h3>
            <div className="text-end">
              <div className="text-xs text-muted">{t("Meeting pulse", "نبض الاجتماع")}</div>
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
                    <td className="py-2">{t(ind.label, ind.labelAr)}</td>
                    <td className="mono py-2">{v === "NO" ? t("N/O", "غ/م") : v ?? "–"}</td>
                    <td className="py-2 text-muted">
                      {typeof v === "number" ? t(PULSE_SCALE[v], PULSE_SCALE_AR[v]) : v === "NO" ? t("Not Observed", "لم تتم الملاحظة") : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {meeting.pulseNote ? (
            <p dir="auto" className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              {meeting.pulseNote}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">{t("Follow-ups", "المتابعات")}</h3>
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
                  {f.status === "Closed" ? t("Closed", "مغلق") : isOverdue(f) ? t("Overdue", "متأخر") : t("Open", "مفتوح")}
                </Pill>
                <span>{f.item}</span>
                <span className="mono text-xs text-faint">{fmtDate(f.targetDate)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-faint">{t("No follow-ups for this meeting.", "لا توجد متابعات لهذا الاجتماع.")}</p>
        )}
      </section>
    </Drawer>
  );
}
