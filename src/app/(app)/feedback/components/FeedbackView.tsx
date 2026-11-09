"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { organizeFeedbackAction } from "@/app/actions/ai";
import { saveFeedbackAction } from "@/app/actions/feedback";
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
          ? "Add a transcript before saving."
          : "Write some feedback before saving.",
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
        ? `Feedback submitted for ${employee.name}.`
        : "Draft saved.",
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
      toast("This browser cannot record audio. Type the transcript instead.");
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
      toast("Microphone access was blocked. Allow it in the browser, or type the transcript.");
    }
  }

  async function transcribeAudio() {
    if (!audio.current) {
      toast("Record a voice note first.");
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
      toast(data?.error ?? "Transcription failed. Type the transcript instead.");
      return;
    }
    const heard = data.text;
    setTranscript((t) => (t.trim() ? `${t.trim()}\n${heard}` : heard));
    setAi(null);
    toast("Transcript added. Check it before saving.");
  }

  if (!manager) {
    return (
      <p className="text-muted">
        No manager profile linked. Ask an admin to assign a manager code.
      </p>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Feedback</h1>
          <p>
            {manager.name} · {manager.title} · {cycle}
          </p>
        </div>
        {isAdmin ? (
          <select
            aria-label="Switch manager"
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
        <Kpi label="Total employees" value={team.length} />
        <Kpi label="Submitted" value={submitted} tone="ok" />
        <Kpi label="Pending" value={team.length - submitted} tone="warn" />
      </div>

      <div
        className="h-2 overflow-hidden rounded bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Feedback completed"
      >
        <i className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>

      <Panel>
        <PanelHeader title="Your team" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Department / Team</th>
                <th className="px-3 py-2">Status</th>
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
                        <Pill tone="ok">Submitted</Pill>
                      ) : st === "Draft" ? (
                        <Pill tone="info">Draft saved</Pill>
                      ) : (
                        <Pill tone="warn">Pending</Pill>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant={st === "Submitted" ? "ghost" : "default"}
                        aria-label={`Feedback for ${e.name}`}
                        onClick={() => open(e.code)}
                      >
                        {st === "Submitted"
                          ? "View"
                          : st === "Draft"
                            ? "Continue"
                            : "Give feedback"}
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
        title="Employee feedback"
        onClose={() => setSelected(null)}
        footer={
          locked ? (
            <Button aria-label="Close feedback" onClick={() => setSelected(null)}>
              Close
            </Button>
          ) : confirming ? (
            <>
              <Button
                aria-label="Back to edit feedback"
                onClick={() => setConfirming(false)}
              >
                Back to edit
              </Button>
              <Button
                variant="primary"
                aria-label="Confirm feedback submission"
                disabled={saving}
                onClick={() => save("Submitted")}
              >
                Confirm submission
              </Button>
            </>
          ) : (
            <>
              <Button aria-label="Cancel feedback" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                aria-label="Save feedback draft"
                disabled={saving}
                onClick={() => save("Draft")}
              >
                Save draft
              </Button>
              <Button
                variant="primary"
                aria-label="Review and submit feedback"
                disabled={saving}
                onClick={() => save("Submitted")}
              >
                Review & submit
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
                    Submitted {formatDate(existing!.feedbackDate)}
                  </Pill>
                ) : (
                  <Pill tone={existing?.status === "Draft" ? "info" : "warn"}>
                    {existing?.status === "Draft" ? "Draft" : "Pending"}
                  </Pill>
                )}
              </div>
            </section>

            {locked ? (
              <section className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
                <h3 className="text-sm">Your feedback</h3>
                <blockquote className="border-l-2 border-line-2 pl-3 whitespace-pre-wrap" dir="auto">
                  {existing!.body}
                </blockquote>
              </section>
            ) : (
              <>
                <div className="inline-flex overflow-hidden rounded-[6px] border border-line-2">
                  {(
                    [
                      ["written", "Write"],
                      ["voice", "Record voice note"],
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
                      Written feedback
                    </span>
                    <textarea
                      rows={9}
                      dir="auto"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="rounded-lg border border-line-2 px-3 py-2 outline-none"
                      placeholder="Strengths, growth areas, concerns…"
                    />
                  </label>
                ) : (
                  <section className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
                    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-line-2 bg-surface-2 p-5">
                      <Pill tone={recording ? "risk" : hasAudio ? "ok" : "mute"}>
                        {recording ? "Recording…" : hasAudio ? "Voice note ready" : "No recording yet"}
                      </Pill>
                      <Button aria-label={recording ? "Stop recording" : "Start recording"} onClick={toggleRecording}>
                        {recording ? "Stop recording" : hasAudio ? "Record again" : "Start recording"}
                      </Button>
                      <Button
                        variant="ai"
                        aria-label="Transcribe voice note"
                        disabled={transcribing || recording || !hasAudio}
                        onClick={transcribeAudio}
                      >
                        {transcribing ? "Transcribing…" : "Transcribe"}
                      </Button>
                      <label className="flex w-full max-w-[260px] flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted">
                          Spoken language
                        </span>
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value)}
                          className="rounded-lg border border-line-2 px-3 py-2 outline-none"
                        >
                          <option>Egyptian Arabic</option>
                          <option>English</option>
                        </select>
                      </label>
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-muted">
                        Transcript
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
                  aria-label="Organise feedback with AI"
                  disabled={organising}
                  onClick={() => {
                    const body = mode === "voice" ? transcript : text;
                    if (!body.trim()) {
                      toast("Add feedback text first.");
                      return;
                    }
                    organise(body);
                  }}
                >
                  {organising ? "Organising…" : "Organise with AI"}
                </Button>

                {ai ? (
                  <div className="space-y-2 rounded-[var(--radius)] border border-ai bg-ai-soft p-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-ai">
                      Structured summary{" "}
                      <Pill tone="ai">
                        {ai.source === "openai" ? ai.model : ai.model === "saved" ? "Saved" : "Local engine"}
                      </Pill>
                    </div>
                    {ai.notice ? <p className="text-[12px] text-muted">{ai.notice}</p> : null}
                    {(
                      [
                        ["strengths", "Strengths"],
                        ["development", "Development"],
                        ["concerns", "Concerns"],
                        ["recommendations", "Recommendations"],
                      ] as const
                    ).map(([key, label]) =>
                      ai.summary[key]?.length ? (
                        <div key={key} className="rounded-lg bg-surface p-3 text-sm">
                          <small className="text-[12px] font-medium text-muted">
                            {label}
                          </small>
                          <ul className="mt-1 list-disc pl-4" dir="auto">
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
