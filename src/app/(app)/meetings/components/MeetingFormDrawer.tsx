"use client";

import { useMemo, useState } from "react";
import { Monitor, Phone } from "lucide-react";
import { assistMeetingAction } from "@/app/actions/ai";
import { createMeetingAction } from "@/app/actions/meetings";
import { Button } from "@/components/ui/button";
import { useLang, useT } from "@/components/i18n/lang";
import { Drawer } from "@/components/ui/drawer";
import { channelLabel } from "@/components/ui/meeting-channel";
import { Pill } from "@/components/ui/pill";
import { RichTextEditor } from "@/components/ui/rich-text";
import { useToast } from "@/components/ui/toast";
import type { MeetingAiAssist } from "@/lib/ai";
import { OUTCOME_SECTIONS, PULSE_INDICATORS, PULSE_SCALE, PULSE_SCALE_AR } from "@/lib/constants";
import { addDaysIso, todayIso } from "@/lib/format";
import { avgPulse, emptyPulse, formatPulse } from "@/lib/pulse";
import type {
  EmployeeRecord,
  MeetingChannel,
  MeetingType,
  PulseScores,
} from "@/types";

const CHANNEL_OPTIONS: MeetingChannel[] = ["Face-to-Face", "Online", "Phone"];

type FormState = {
  department: string;
  unit: string;
  team: string;
  meetingType: MeetingType;
  channel: MeetingChannel;
  meetingDate: string;
  employeeCodes: string[];
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  pulse: PulseScores;
  pulseNote: string;
  followups: Array<{ item: string; targetDate: string }>;
  aiSummary: string;
  aiAccepted: boolean;
};

function blank(): FormState {
  return {
    department: "",
    unit: "",
    team: "",
    meetingType: "Individual",
    channel: "Face-to-Face",
    meetingDate: todayIso(),
    employeeCodes: [],
    positive: "",
    risk: "",
    negative: "",
    recommendation: "",
    followUpNote: "",
    pulse: emptyPulse(),
    pulseNote: "",
    followups: [],
    aiSummary: "",
    aiAccepted: false,
  };
}

export function MeetingFormDrawer({
  open,
  employees,
  onClose,
}: {
  open: boolean;
  employees: EmployeeRecord[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const t = useT();
  const [form, setForm] = useState<FormState>(blank);
  const [ai, setAi] = useState<
    (MeetingAiAssist & { source: "openai" | "local"; model: string; notice?: string }) | null
  >(null);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);

  const depts = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort(),
    [employees],
  );
  const units = useMemo(
    () =>
      [...new Set(employees.filter((e) => !form.department || e.department === form.department).map((e) => e.unit))].sort(),
    [employees, form.department],
  );
  const teams = useMemo(
    () =>
      [
        ...new Set(
          employees
            .filter(
              (e) =>
                (!form.department || e.department === form.department) &&
                (!form.unit || e.unit === form.unit),
            )
            .map((e) => e.team),
        ),
      ].sort(),
    [employees, form.department, form.unit],
  );

  const pool = employees.filter(
    (e) =>
      e.status === "Active" &&
      (!form.department || e.department === form.department) &&
      (!form.unit || e.unit === form.unit) &&
      (!form.team || e.team === form.team) &&
      !form.employeeCodes.includes(e.code),
  );

  const canAdd = form.meetingType === "Group" || form.employeeCodes.length === 0;

  function close() {
    setForm(blank());
    setAi(null);
    onClose();
  }

  async function save() {
    setSaving(true);
    const pulse =
      form.meetingType === "Individual" &&
      Object.values(form.pulse).some((v) => v !== null)
        ? form.pulse
        : null;

    const result = await createMeetingAction({
      meetingDate: form.meetingDate,
      meetingType: form.meetingType,
      channel: form.channel,
      department: form.department,
      unit: form.unit,
      team: form.team,
      employeeCodes: form.employeeCodes,
      positive: form.positive,
      risk: form.risk,
      negative: form.negative,
      recommendation: form.recommendation,
      followUpNote: form.followUpNote,
      pulse,
      pulseNote: form.pulseNote,
      aiSummary: form.aiAccepted ? form.aiSummary : "",
      followups: form.followups,
    });
    setSaving(false);

    if (!result.ok) {
      toast(result.error);
      return;
    }

    // Fill dept/unit/team from first employee if blank
    toast(t(`${result.id} saved to meeting history.`, `تم حفظ ${result.id} في سجل الاجتماعات.`));
    close();
  }

  return (
    <Drawer
      open={open}
      title={t("New meeting record", "سجل اجتماع جديد")}
      onClose={close}
      width={1040}
      footer={
        <>
          <Button aria-label={t("Cancel new meeting", "إلغاء سجل الاجتماع الجديد")} onClick={close}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            variant="primary"
            aria-label={t("Save meeting", "حفظ الاجتماع")}
            disabled={saving}
            onClick={save}
          >
            {saving ? t("Saving…", "جارٍ الحفظ…") : t("Save meeting", "حفظ الاجتماع")}
          </Button>
        </>
      }
    >
      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">{t("Meeting information", "معلومات الاجتماع")}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t("Department", "القسم")}>
            <select
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
              value={form.department}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  department: e.target.value,
                  unit: "",
                  team: "",
                }))
              }
            >
              <option value="">{t("All departments", "كل الأقسام")}</option>
              {depts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Unit", "الوحدة")}>
            <select
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
              value={form.unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit: e.target.value, team: "" }))
              }
            >
              <option value="">{t("All units", "كل الوحدات")}</option>
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Team", "الفريق")}>
            <select
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
              value={form.team}
              onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
            >
              <option value="">{t("All teams", "كل الفرق")}</option>
              {teams.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Meeting type", "نوع الاجتماع")}>
            <Seg
              options={["Individual", "Group"]}
              labels={{ Individual: t("Individual", "فردي"), Group: t("Group", "جماعي") }}
              value={form.meetingType}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  meetingType: v as MeetingType,
                  employeeCodes:
                    v === "Individual" ? f.employeeCodes.slice(0, 1) : f.employeeCodes,
                }))
              }
            />
          </Field>
          <Field label={t("Channel", "القناة")}>
            <ChannelSeg
              value={form.channel}
              onChange={(v) => setForm((f) => ({ ...f, channel: v }))}
            />
          </Field>
          <Field label={t("Meeting date", "تاريخ الاجتماع")}>
            <input
              type="date"
              max={todayIso()}
              value={form.meetingDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, meetingDate: e.target.value }))
              }
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
            />
          </Field>
        </div>
        <Field label={form.meetingType === "Group" ? t("Employees", "الموظفون") : t("Employee", "الموظف")}>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.employeeCodes.map((code) => {
              const emp = employees.find((e) => e.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent"
                >
                  {emp?.name ?? code}
                  <button
                    type="button"
                    aria-label={t(`Remove ${emp?.name ?? code}`, `إزالة ${emp?.name ?? code}`)}
                    className="grid size-5 cursor-pointer place-items-center rounded-full outline-none hover:bg-accent hover:text-accent-ink"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        employeeCodes: f.employeeCodes.filter((c) => c !== code),
                      }))
                    }
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          {canAdd ? (
            <select
              aria-label={t("Add employee", "إضافة موظف")}
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
              value=""
              onChange={(e) => {
                const code = e.target.value;
                if (!code) return;
                const emp = employees.find((x) => x.code === code);
                setForm((f) => ({
                  ...f,
                  employeeCodes: [...f.employeeCodes, code],
                  department: f.department || emp?.department || "",
                  unit: f.unit || emp?.unit || "",
                  team: f.team || emp?.team || "",
                }));
              }}
            >
              <option value="">{t(`+ Add employee (${pool.length} available)`, `+ إضافة موظف (${pool.length} متاح)`)}</option>
              {pool.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.name} · {e.code} · {e.team}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-faint">{t("Switch to Group to add more participants.", "انتقل إلى «جماعي» لإضافة مشاركين آخرين.")}</p>
          )}
        </Field>
      </section>

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <h3 className="text-sm">{t("Meeting outcomes", "مخرجات الاجتماع")}</h3>
        {OUTCOME_SECTIONS.map((sec) => (
          <div key={sec.key} className="grid grid-cols-[4px_minmax(0,1fr)] gap-3">
            <i
              className={
                sec.tone === "pos"
                  ? "rounded bg-ok"
                  : sec.tone === "risk"
                    ? "rounded bg-warn"
                    : sec.tone === "neg"
                      ? "rounded bg-risk"
                      : sec.tone === "rec"
                        ? "rounded bg-info"
                        : "rounded bg-line-2"
              }
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{`${t(sec.label, sec.labelAr)} · ${t(sec.hint, sec.hintAr)}`}</span>
              <RichTextEditor
                label={t(sec.label, sec.labelAr)}
                value={form[sec.key]}
                onChange={(html) => setForm((f) => ({ ...f, [sec.key]: html }))}
                minHeight={240}
              />
            </div>
          </div>
        ))}
        <Button
          variant="ai"
          aria-label={t("Analyse notes with AI", "تحليل الملاحظات بالذكاء الاصطناعي")}
          disabled={analysing}
          onClick={async () => {
            setAnalysing(true);
            const result = await assistMeetingAction({
              positive: form.positive,
              risk: form.risk,
              negative: form.negative,
              recommendation: form.recommendation,
              followUpNote: form.followUpNote,
              meetingDate: form.meetingDate,
            });
            setAnalysing(false);
            if (!result.ok) {
              toast(result.error);
              return;
            }
            setAi(result);
            setForm((f) => ({ ...f, aiSummary: result.summary, aiAccepted: false }));
          }}
        >
          {analysing ? t("Analysing…", "جارٍ التحليل…") : t("Analyse notes with AI", "تحليل الملاحظات بالذكاء الاصطناعي")}
        </Button>
        {ai ? (
          <div className="space-y-2 rounded-[var(--radius)] border border-ai bg-ai-soft p-3">
            <div className="flex flex-wrap items-center gap-2 font-semibold text-ai">
              {t("AI suggestions", "اقتراحات الذكاء الاصطناعي")}{" "}
              <Pill tone="ai">{ai.source === "openai" ? ai.model : t("Local engine", "المحرك المحلي")}</Pill>
            </div>
            {ai.notice ? <p className="text-[12px] text-muted">{ai.notice}</p> : null}
            {ai.summary ? (
              <div className="rounded-lg bg-surface p-3 text-sm">
                <small className="text-[12px] font-medium text-muted">
                  {t("Meeting summary", "ملخص الاجتماع")}
                </small>
                <p className="mt-1" dir="auto">{ai.summary}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    aria-label={t("Accept AI summary", "قبول ملخص الذكاء الاصطناعي")}
                    aria-pressed={form.aiAccepted}
                    onClick={() => {
                      setForm((f) => ({ ...f, aiAccepted: true }));
                      toast(t("Summary will be saved with the meeting.", "سيُحفظ الملخص مع الاجتماع."));
                    }}
                  >
                    {form.aiAccepted ? t("Accepted", "مقبول") : t("Accept", "قبول")}
                  </Button>
                </div>
              </div>
            ) : null}
            {ai.fus.map((fu, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-surface p-3 text-sm">
                <div>
                  <small className="text-[12px] font-medium text-muted">
                    {t("Suggested follow-up", "متابعة مقترحة")}
                  </small>
                  <p className="mt-1">{fu.item}</p>
                </div>
                <Button
                  size="sm"
                  aria-label={t("Add suggested follow-up", "إضافة المتابعة المقترحة")}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      followups: [...f.followups, { item: fu.item, targetDate: fu.target }],
                    }))
                  }
                >
                  {t("Add follow-up", "إضافة متابعة")}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {form.meetingType === "Individual" ? (
        <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm">{t("Employee Pulse Review", "مراجعة النبض للموظف")}</h3>
              <p className="text-xs text-faint">
                {t("Development observation, not a performance appraisal.", "ملاحظة تطويرية، وليست تقييم أداء.")}
              </p>
            </div>
            <div className="text-end">
              <div className="text-xs text-muted">{t("Meeting pulse", "نبض الاجتماع")}</div>
              <b className="font-[family-name:var(--font-display)] text-2xl">
                {formatPulse(avgPulse(form.pulse))}
              </b>
            </div>
          </div>
          {PULSE_INDICATORS.map((ind) => (
            <div
              key={ind.key}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2 last:border-0"
            >
              <div>
                <b className="text-sm">{t(ind.label, ind.labelAr)}</b>
                <small className="block text-[11.5px] text-faint">{t(ind.hint, ind.hintAr)}</small>
              </div>
              <div className="flex gap-1" role="group" aria-label={t(ind.label, ind.labelAr)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    title={t(PULSE_SCALE[n], PULSE_SCALE_AR[n])}
                    aria-label={`${t(ind.label, ind.labelAr)} ${n}`}
                    aria-pressed={form.pulse[ind.key] === n}
                    className={`grid size-8 cursor-pointer place-items-center rounded-md border outline-none mono text-xs ${
                      form.pulse[ind.key] === n
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line-2 text-muted hover:border-accent"
                    }`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        pulse: {
                          ...f.pulse,
                          [ind.key]: f.pulse[ind.key] === n ? null : n,
                        },
                      }))
                    }
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label={t(`${ind.label} not observed`, `${ind.labelAr} لم تتم الملاحظة`)}
                  aria-pressed={form.pulse[ind.key] === "NO"}
                  className={`cursor-pointer rounded-md border px-2 outline-none mono text-[11px] ${
                    form.pulse[ind.key] === "NO"
                      ? "border-line-2 bg-surface-2"
                      : "border-line-2 text-muted"
                  }`}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      pulse: {
                        ...f.pulse,
                        [ind.key]: f.pulse[ind.key] === "NO" ? null : "NO",
                      },
                    }))
                  }
                >
                  {t("N/O", "غ/م")}
                </button>
              </div>
            </div>
          ))}
          <Field label={t("Reviewer notes (optional)", "ملاحظات المراجع (اختياري)")}>
            <textarea
              rows={4}
              dir="auto"
              value={form.pulseNote}
              onChange={(e) => setForm((f) => ({ ...f, pulseNote: e.target.value }))}
              className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
            />
          </Field>
        </section>
      ) : (
        <section className="rounded-[var(--radius)] border border-line bg-surface p-4 text-sm text-muted">
          {t("Pulse ratings are recorded for individual meetings only.", "تُسجَّل تقييمات النبض للاجتماعات الفردية فقط.")}
        </section>
      )}

      <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm">{t("Follow-ups from this meeting", "المتابعات من هذا الاجتماع")}</h3>
          <Button
            size="sm"
            aria-label={t("Add follow-up", "إضافة متابعة")}
            onClick={() =>
              setForm((f) => ({
                ...f,
                followups: [
                  ...f.followups,
                  { item: "", targetDate: addDaysIso(todayIso(), 14) },
                ],
              }))
            }
          >
            {t("+ Add follow-up", "+ إضافة متابعة")}
          </Button>
        </div>
        {form.followups.length ? (
          form.followups.map((fu, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_160px_auto] md:items-end">
              <Field label={t("Follow-up item", "بند المتابعة")}>
                <input
                  dir="auto"
                  value={fu.item}
                  onChange={(e) =>
                    setForm((f) => {
                      const followups = [...f.followups];
                      followups[i] = { ...followups[i], item: e.target.value };
                      return { ...f, followups };
                    })
                  }
                  className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
                />
              </Field>
              <Field label={t("Target date", "التاريخ المستهدف")}>
                <input
                  type="date"
                  value={fu.targetDate}
                  onChange={(e) =>
                    setForm((f) => {
                      const followups = [...f.followups];
                      followups[i] = { ...followups[i], targetDate: e.target.value };
                      return { ...f, followups };
                    })
                  }
                  className="w-full rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
                />
              </Field>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("Remove follow-up", "إزالة المتابعة")}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    followups: f.followups.filter((_, idx) => idx !== i),
                  }))
                }
              >
                {t("Remove", "إزالة")}
              </Button>
            </div>
          ))
        ) : (
          <p className="text-faint">{t("None yet.", "لا يوجد بعد.")}</p>
        )}
      </section>
    </Drawer>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Seg({
  options,
  labels,
  value,
  onChange,
}: {
  options: string[];
  labels: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-[6px] border border-line-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={value === opt}
          aria-label={labels[opt] ?? opt}
          className={`cursor-pointer px-3 py-2 text-sm outline-none ${
            value === opt
              ? "bg-active font-medium text-ink"
              : "text-muted hover:bg-surface-2"
          }`}
          onClick={() => onChange(opt)}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function ChannelSeg({
  value,
  onChange,
}: {
  value: MeetingChannel;
  onChange: (v: MeetingChannel) => void;
}) {
  const uiLang = useLang();
  return (
    <div className="grid w-full grid-cols-3 overflow-hidden rounded-[6px] border border-line-2">
      {CHANNEL_OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            aria-label={channelLabel(opt, uiLang)}
            title={channelLabel(opt, uiLang)}
            className={`inline-flex h-10 cursor-pointer items-center justify-center outline-none ${
              active ? "bg-active font-medium text-ink" : "text-muted hover:bg-surface-2"
            }`}
            onClick={() => onChange(opt)}
          >
            {opt === "Online" ? (
              <Monitor className="size-4" strokeWidth={1.75} aria-hidden />
            ) : opt === "Phone" ? (
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
            ) : (
              <span className="text-xs font-semibold tracking-wide">P2P</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
