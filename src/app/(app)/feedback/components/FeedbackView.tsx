"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { organizeFeedbackAction } from "@/app/actions/ai";
import { saveFeedbackAction } from "@/app/actions/feedback";
import { useLang, useT } from "@/components/i18n/lang";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Kpi } from "@/components/ui/kpi";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type {
  EmployeeRecord,
  FeedbackAiSummary,
  FeedbackMode,
  ManagerFeedbackRecord,
  ManagerRecord,
} from "@/types";

type AiState = { summary: FeedbackAiSummary; source: "openai" | "local"; model: string; notice?: string };

export function FeedbackView({
  managers,
  manager,
  team,
  feedback,
  isAdmin,
  cycle,
}: {
  managers: ManagerRecord[];
  manager: ManagerRecord | null;
  team: EmployeeRecord[];
  feedback: ManagerFeedbackRecord[];
  isAdmin: boolean;
  cycle: string;
}) {
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<FeedbackMode>("written");
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState("Egyptian Arabic");
  const [ai, setAi] = useState<AiState | null>(null);
  const [organising, setOrganising] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const audio = useRef<Blob | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const latestByEmp = useMemo(() => {
    const map = new Map<string, ManagerFeedbackRecord>();
    feedback.forEach((f) => {
      const prev = map.get(f.employeeCode);
      if (!prev || f.feedbackDate >= prev.feedbackDate) map.set(f.employeeCode, f);
    });
    return map;
  }, [feedback]);

  const submitted = team.filter(
    (e) => latestByEmp.get(e.code)?.status === "Submitted",
  ).length;
  const pct = team.length ? Math.round((submitted / team.length) * 100) : 0;

  const employee = team.find((e) => e.code === selected) ?? null;
  const existing = selected ? latestByEmp.get(selected) : undefined;
  const locked = existing?.status === "Submitted";

  function open(code: string) {
    const ex = latestByEmp.get(code);
    setSelected(code);
    setMode(ex?.mode === "voice" ? "voice" : "written");
    setText(ex && ex.mode !== "voice" ? ex.body : "");
    setTranscript(ex && ex.mode === "voice" ? ex.body : "");
    setLang(ex?.language || "Egyptian Arabic");
    setAi(ex?.aiSummary ? { summary: ex.aiSummary, source: "local", model: "saved" } : null);
    setHasAudio(Boolean(ex?.hasAudio));
    audio.current = null;
    setConfirming(false);
  }

  async function save(status: "Draft" | "Submitted") {
    if (!employee || !manager) return;
    const body = (mode === "voice" ? transcript : text).trim();
    if (!body) {
      toast(
        mode === "voice"
          ? t("Add a transcript before saving.", "أضف النص المفرغ قبل الحفظ.")
          : t("Write some feedback before saving.", "اكتب بعض الملاحظات قبل الحفظ."),
      );
      return;
    }
    if (status === "Submitted" && !confirming) {
      if (!ai) await organise(body);
      setConfirming(true);
      return;
    }
    setSaving(true);
    const result = await saveFeedbackAction({
      employeeCode: employee.code,
      managerCode: manager.code,
      mode,
      body,
      language: mode === "voice" ? lang : null,
      hasAudio: mode === "voice" && hasAudio,
      status,
      aiSummary: ai?.summary ?? null,
      existingId:
        existing && existing.status === "Draft" ? existing.id : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    toast(
      status === "Submitted"
        ? t(`Feedback submitted for ${employee.name}.`, `تم إرسال الملاحظات بخصوص ${employee.name}.`)
        : t("Draft saved.", "تم حفظ المسودة."),
    );
    setSelected(null);
    router.refresh();
  }

  async function organise(body: string) {
    setOrganising(true);
    const result = await organizeFeedbackAction(body);
    setOrganising(false);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    setAi({ summary: result.summary, source: result.source, model: result.model, notice: result.notice });
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast(t("This browser cannot record audio. Type the transcript instead.", "لا يستطيع هذا المتصفح تسجيل الصوت. اكتب النص المفرغ بدلاً من ذلك."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        audio.current = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setHasAudio(true);
        setRecording(false);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast(t("Microphone access was blocked. Allow it in the browser, or type the transcript.", "تم حظر الوصول إلى الميكروفون. اسمح به من المتصفح، أو اكتب النص المفرغ."));
    }
  }

  async function transcribeAudio() {
    if (!audio.current) {
      toast(t("Record a voice note first.", "سجّل مقطعاً صوتياً أولاً."));
      return;
    }
    setTranscribing(true);
    const form = new FormData();
    form.append("audio", audio.current, "voice-note.webm");
    form.append("language", lang);
    const res = await fetch("/api/ai/transcribe", { method: "POST", body: form }).catch(() => null);
    setTranscribing(false);
    const data = (await res?.json().catch(() => null)) as { text?: string; error?: string } | null;
    if (!res?.ok || !data?.text) {
      toast(data?.error ?? t("Transcription failed. Type the transcript instead.", "فشل التفريغ. اكتب النص المفرغ بدلاً من ذلك."));
      return;
    }
    const heard = data.text;
    setTranscript((t) => (t.trim() ? `${t.trim()}\n${heard}` : heard));
    setAi(null);
    toast(t("Transcript added. Check it before saving.", "تمت إضافة النص المفرغ. راجعه قبل الحفظ."));
  }

  if (!manager) {
    return (
      <p className="text-muted">
        {t(
          "No manager profile linked. Ask an admin to assign a manager code.",
          "لم يتم ربط ملف مدير. اطلب من المسؤول تعيين رمز المدير.",
        )}
      </p>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("Feedback", "الملاحظات")}</h1>
          <p>
            {manager.name} · {manager.title} · {cycle}
          </p>
        </div>
        {isAdmin ? (
          <select
            aria-label={t("Switch manager", "تبديل المدير")}
            className="rounded-lg border border-line-2 px-3 py-2 outline-none"
            value={manager.code}
            onChange={(e) => router.push(`/feedback?mgr=${e.target.value}`)}
          >
            {managers.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name} · {m.title}
              </option>
            ))}
          </select>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t("Total employees", "إجمالي الموظفين")} value={team.length} />
        <Kpi label={t("Submitted", "تم الإرسال")} value={submitted} tone="ok" />
        <Kpi label={t("Pending", "قيد الانتظار")} value={team.length - submitted} tone="warn" />
      </div>

      <div
        className="h-2 overflow-hidden rounded bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("Feedback completed", "اكتمال الملاحظات")}
      >
        <i className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>

      <Panel>
        <PanelHeader title={t("Your team", "فريقك")} />
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">{t("Employee", "الموظف")}</th>
                <th className="px-3 py-2">{t("Code", "الرمز")}</th>
                <th className="px-3 py-2">{t("Department / Team", "القسم / الفريق")}</th>
                <th className="px-3 py-2">{t("Status", "الحالة")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {team.map((e) => {
                const f = latestByEmp.get(e.code);
                const st = f?.status ?? "Pending";
                return (
                  <tr key={e.code} className="border-b border-line last:border-0">
                    <td className="px-3 py-3">
                      <b className="font-semibold">{e.name}</b>
                      <div className="text-xs text-faint">{e.title}</div>
                    </td>
                    <td className="mono px-3 py-3">{e.code}</td>
                    <td className="px-3 py-3">
                      {e.department} / {e.team}
                    </td>
                    <td className="px-3 py-3">
                      {st === "Submitted" ? (
                        <Pill tone="ok">{t("Submitted", "تم الإرسال")}</Pill>
                      ) : st === "Draft" ? (
                        <Pill tone="info">{t("Draft saved", "تم حفظ المسودة")}</Pill>
                      ) : (
                        <Pill tone="warn">{t("Pending", "قيد الانتظار")}</Pill>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <Button
                        size="sm"
                        variant={st === "Submitted" ? "ghost" : "default"}
                        aria-label={t(`Feedback for ${e.name}`, `الملاحظات بخصوص ${e.name}`)}
                        onClick={() => open(e.code)}
                      >
                        {st === "Submitted"
                          ? t("View", "عرض")
                          : st === "Draft"
                            ? t("Continue", "متابعة")
                            : t("Give feedback", "تقديم ملاحظات")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Drawer
        open={Boolean(selected && employee)}
        title={t("Employee feedback", "ملاحظات الموظف")}
        onClose={() => setSelected(null)}
        footer={
          locked ? (
            <Button aria-label={t("Close feedback", "إغلاق الملاحظات")} onClick={() => setSelected(null)}>
              {t("Close", "إغلاق")}
            </Button>
          ) : confirming ? (
            <>
              <Button
                aria-label={t("Back to edit feedback", "الرجوع لتعديل الملاحظات")}
                onClick={() => setConfirming(false)}
              >
                {t("Back to edit", "الرجوع للتعديل")}
              </Button>
              <Button
                variant="primary"
                aria-label={t("Confirm feedback submission", "تأكيد إرسال الملاحظات")}
                disabled={saving}
                onClick={() => save("Submitted")}
              >
                {t("Confirm submission", "تأكيد الإرسال")}
              </Button>
            </>
          ) : (
            <>
              <Button aria-label={t("Cancel feedback", "إلغاء الملاحظات")} onClick={() => setSelected(null)}>
                {t("Cancel", "إلغاء")}
              </Button>
              <Button
                aria-label={t("Save feedback draft", "حفظ مسودة الملاحظات")}
                disabled={saving}
                onClick={() => save("Draft")}
              >
                {t("Save draft", "حفظ المسودة")}
              </Button>
              <Button
                variant="primary"
                aria-label={t("Review and submit feedback", "مراجعة إرسال الملاحظات")}
                disabled={saving}
                onClick={() => save("Submitted")}
              >
                {t("Review & submit", "مراجعة وإرسال")}
              </Button>
            </>
          )
        }
      >
        {employee ? (
          <>
            <section className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3>
                    {employee.name}{" "}
                    <span className="mono text-faint">{employee.code}</span>
                  </h3>
                  <p className="text-sm text-muted">
                    {employee.department} · {employee.unit} · {employee.team}
                  </p>
                </div>
                {locked ? (
                  <Pill tone="ok">
                    {t("Submitted", "تم الإرسال")} {fmtDate(existing!.feedbackDate)}
                  </Pill>
                ) : (
                  <Pill tone={existing?.status === "Draft" ? "info" : "warn"}>
                    {existing?.status === "Draft" ? t("Draft", "مسودة") : t("Pending", "قيد الانتظار")}
                  </Pill>
                )}
              </div>
            </section>

            {locked ? (
              <section className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
                <h3 className="text-sm">{t("Your feedback", "ملاحظاتك")}</h3>
                <blockquote className="border-s-2 border-line-2 ps-3 whitespace-pre-wrap" dir="auto">
                  {existing!.body}
                </blockquote>
              </section>
            ) : (
              <>
                <div className="inline-flex overflow-hidden rounded-[6px] border border-line-2">
                  {(
                    [
                      ["written", t("Write", "كتابة")],
                      ["voice", t("Record voice note", "تسجيل مقطع صوتي")],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={mode === v}
                      aria-label={label}
                      className={`cursor-pointer px-3 py-2 text-sm outline-none ${
                        mode === v
                          ? "bg-active font-medium text-ink"
                          : "text-muted hover:bg-surface-2"
                      }`}
                      onClick={() => {
                        setMode(v);
                        setAi(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {mode === "written" ? (
                  <label className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface p-4">
                    <span className="text-xs font-semibold text-muted">
                      {t("Written feedback", "الملاحظات المكتوبة")}
                    </span>
                    <textarea
                      rows={9}
                      dir="auto"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="rounded-lg border border-line-2 px-3 py-2 outline-none"
                      placeholder={t(
                        "Strengths, growth areas, concerns…",
                        "نقاط القوة، مجالات التطوير، المخاوف…",
                      )}
                    />
                  </label>
                ) : (
                  <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
                    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-line-2 bg-surface-2 p-5">
                      <Pill tone={recording ? "risk" : hasAudio ? "ok" : "mute"}>
                        {recording
                          ? t("Recording…", "جارٍ التسجيل…")
                          : hasAudio
                            ? t("Voice note ready", "المقطع الصوتي جاهز")
                            : t("No recording yet", "لا يوجد تسجيل بعد")}
                      </Pill>
                      <Button
                        aria-label={recording ? t("Stop recording", "إيقاف التسجيل") : t("Start recording", "بدء التسجيل")}
                        onClick={toggleRecording}
                      >
                        {recording
                          ? t("Stop recording", "إيقاف التسجيل")
                          : hasAudio
                            ? t("Record again", "إعادة التسجيل")
                            : t("Start recording", "بدء التسجيل")}
                      </Button>
                      <Button
                        variant="ai"
                        aria-label={t("Transcribe voice note", "تفريغ المقطع الصوتي")}
                        disabled={transcribing || recording || !hasAudio}
                        onClick={transcribeAudio}
                      >
                        {transcribing ? t("Transcribing…", "جارٍ التفريغ…") : t("Transcribe", "تفريغ")}
                      </Button>
                      <label className="flex w-full max-w-[260px] flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted">
                          {t("Spoken language", "لغة الحديث")}
                        </span>
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value)}
                          className="rounded-lg border border-line-2 px-3 py-2 outline-none"
                        >
                          <option value="Egyptian Arabic">{t("Egyptian Arabic", "العربية المصرية")}</option>
                          <option value="English">{t("English", "الإنجليزية")}</option>
                        </select>
                      </label>
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-muted">
                        {t("Transcript", "النص المفرغ")}
                      </span>
                      <textarea
                        rows={7}
                        dir="auto"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="rounded-lg border border-line-2 px-3 py-2 outline-none"
                      />
                    </label>
                  </section>
                )}

                <Button
                  variant="ai"
                  aria-label={t("Organise feedback with AI", "تنظيم الملاحظات بالذكاء الاصطناعي")}
                  disabled={organising}
                  onClick={() => {
                    const body = mode === "voice" ? transcript : text;
                    if (!body.trim()) {
                      toast(t("Add feedback text first.", "أضف نص الملاحظات أولاً."));
                      return;
                    }
                    organise(body);
                  }}
                >
                  {organising
                    ? t("Organising…", "جارٍ التنظيم…")
                    : t("Organise with AI", "تنظيم بالذكاء الاصطناعي")}
                </Button>

                {ai ? (
                  <div className="space-y-2 rounded-[var(--radius)] border border-ai bg-ai-soft p-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-ai">
                      {t("Structured summary", "ملخص منظم")}{" "}
                      <Pill tone="ai">
                        {ai.source === "openai"
                          ? ai.model
                          : ai.model === "saved"
                            ? t("Saved", "محفوظ")
                            : t("Local engine", "المحرك المحلي")}
                      </Pill>
                    </div>
                    {ai.notice ? <p className="text-[12px] text-muted">{ai.notice}</p> : null}
                    {(
                      [
                        ["strengths", t("Strengths", "نقاط القوة")],
                        ["development", t("Development", "مجالات التطوير")],
                        ["concerns", t("Concerns", "المخاوف")],
                        ["recommendations", t("Recommendations", "التوصيات")],
                      ] as const
                    ).map(([key, label]) =>
                      ai.summary[key]?.length ? (
                        <div key={key} className="rounded-lg bg-surface p-3 text-sm">
                          <small className="text-[12px] font-medium text-muted">
                            {label}
                          </small>
                          <ul className="mt-1 list-disc ps-4" dir="auto">
                            {ai.summary[key].map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </Drawer>
    </>
  );
}
