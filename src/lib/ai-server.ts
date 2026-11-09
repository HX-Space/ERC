import { createHash } from "crypto";
import { query } from "@/lib/db";
import { addDaysIso, todayIso } from "@/lib/format";
import {
  ANALYTICS_THEMES,
  POSITIVE_THEMES,
  THEME_RECS,
  assistMeetingNotes,
  organizeFeedback,
  scanThemes,
  type MeetingAiAssist,
} from "@/lib/ai";
import type { FeedbackAiSummary, MeetingRecord } from "@/types";

/*
  Server-side AI. With OPENAI_API_KEY set, requests go to OpenAI (Chat
  Completions with a strict JSON schema; audio to the transcription endpoint).
  Without a key — or if OpenAI fails — the local engine in lib/ai.ts answers
  with the same shape, so every screen works either way. Every response says
  which engine produced it.

  Env: OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TRANSCRIBE_MODEL, OPENAI_BASE_URL.
  Never import this file from a client component: it reads the key.
*/

export type AiSource = "openai" | "local";

export interface AiMeta {
  source: AiSource;
  model: string;
  /** Set when OpenAI was configured but failed and the local engine answered. */
  notice?: string;
}

export function aiConfig() {
  const key = process.env.OPENAI_API_KEY?.trim() || "";
  return {
    enabled: key.length > 0,
    key,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    transcribeModel: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe",
    baseUrl: (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
  };
}

export function aiStatus(): { enabled: boolean; model: string } {
  const c = aiConfig();
  return { enabled: c.enabled, model: c.enabled ? c.model : "local" };
}

/* ---------- Cache ---------- */

async function cached<T>(kind: string, model: string, input: unknown, run: () => Promise<T>): Promise<T> {
  const key = createHash("sha256").update(`${kind}|${model}|${JSON.stringify(input)}`).digest("hex");
  try {
    const hit = await query<{ result: T }>(`SELECT result FROM employee_relations_ai_cache WHERE key = $1`, [key]);
    if (hit.rows[0]) return hit.rows[0].result;
  } catch {
    // ai_cache is optional (a database created before it existed simply skips caching).
  }
  const result = await run();
  try {
    await query(
      `INSERT INTO employee_relations_ai_cache (key, kind, model, result) VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING`,
      [key, kind, model, JSON.stringify(result)],
    );
  } catch {
    /* optional */
  }
  return result;
}

/* ---------- OpenAI transport ---------- */

async function chatJson<T>(
  system: string,
  user: string,
  name: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const c = aiConfig();
  const res = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: c.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
  };
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`OpenAI refused: ${msg.refusal}`);
  if (!msg?.content) throw new Error("OpenAI returned no content.");
  return JSON.parse(msg.content) as T;
}

const str = { type: "string" } as const;
const strList = { type: "array", items: str } as const;
function obj(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

const PRIVACY =
  "You assist an Employee Relations team. Notes are confidential. Use only the facts in the input; " +
  "never invent names, numbers or events. Be neutral and specific. Write in English unless the input is in another language, then use that language.";

async function withFallback<T>(
  openai: () => Promise<T>,
  local: () => T,
): Promise<{ result: T } & AiMeta> {
  const c = aiConfig();
  if (!c.enabled) return { result: local(), source: "local", model: "local" };
  try {
    return { result: await openai(), source: "openai", model: c.model };
  } catch (error) {
    console.error("[ai] falling back to local engine:", error);
    return {
      result: local(),
      source: "local",
      model: "local",
      notice: "OpenAI could not be reached, so the local engine answered.",
    };
  }
}

/* ---------- Meeting notes assist ---------- */

export interface MeetingNotes {
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  meetingDate: string;
}

export async function meetingAssist(notes: MeetingNotes): Promise<MeetingAiAssist & AiMeta> {
  const c = aiConfig();
  const out = await withFallback(
    () =>
      cached("meeting-assist", c.model, notes, async () => {
        const r = await chatJson<{
          summary: string;
          risks: string[];
          positives: string[];
          follow_ups: Array<{ item: string; due_in_days: number }>;
        }>(
          `${PRIVACY} You read the notes an ER specialist wrote after a meeting with one or more employees. ` +
            "Return: a 2-3 sentence factual summary for the record; the concerns or risks raised (short, one per item); " +
            "the positives (short); and up to 3 concrete follow-up actions the ER specialist should take, each with a " +
            "realistic number of days until it is due (7-30).",
          JSON.stringify({
            positive_feedback: notes.positive,
            concerns_and_risks: notes.risk,
            negative_feedback: notes.negative,
            recommendations: notes.recommendation,
            follow_up_required: notes.followUpNote,
          }),
          "meeting_assist",
          obj({
            summary: str,
            risks: strList,
            positives: strList,
            follow_ups: {
              type: "array",
              items: obj({ item: str, due_in_days: { type: "integer" } }),
            },
          }),
        );
        const base = notes.meetingDate || todayIso();
        return {
          summary: r.summary,
          risks: r.risks.slice(0, 5).map((t) => ({ t })),
          pos: r.positives.slice(0, 5).map((t) => ({ t })),
          fus: r.follow_ups.slice(0, 3).map((f) => ({
            item: f.item,
            target: addDaysIso(base, Math.min(60, Math.max(1, Math.round(f.due_in_days || 14)))),
          })),
        };
      }),
    () => assistMeetingNotes(notes),
  );
  return { ...out.result, source: out.source, model: out.model, notice: out.notice };
}

/* ---------- Manager feedback ---------- */

export async function feedbackSummary(body: string): Promise<{ summary: FeedbackAiSummary } & AiMeta> {
  const c = aiConfig();
  const out = await withFallback(
    () =>
      cached("feedback-summary", c.model, body, () =>
        chatJson<FeedbackAiSummary>(
          `${PRIVACY} A manager wrote (or dictated) year-end feedback about one employee. Organise it into ` +
            "strengths, development areas, concerns and recommendations. Each item is one short sentence taken " +
            "from the feedback. Leave a list empty when the feedback says nothing for it.",
          body,
          "feedback_summary",
          obj({ strengths: strList, development: strList, concerns: strList, recommendations: strList }),
        ),
      ),
    () => organizeFeedback(body),
  );
  return { summary: out.result, source: out.source, model: out.model, notice: out.notice };
}

/* ---------- Analytics insights ---------- */

export interface InsightTheme {
  label: string;
  meetingIds: string[];
  teams: string[];
}

export interface AnalyticsInsights {
  summary: string;
  issues: InsightTheme[];
  positives: InsightTheme[];
  actions: string[];
}

function localInsights(meetings: MeetingRecord[]): AnalyticsInsights {
  const neg = scanThemes(
    meetings.map((m) => ({ id: m.id, text: `${m.risk}\n${m.negative}`, team: m.team })),
    ANALYTICS_THEMES,
  );
  const pos = scanThemes(
    meetings.map((m) => ({ id: m.id, text: m.positive, team: m.team })),
    POSITIVE_THEMES,
  );
  const top = neg[0];
  return {
    summary: meetings.length
      ? `${meetings.length} meetings analysed. ${
          top
            ? `The most frequent concern is ${top.label.toLowerCase()} (${top.ids.length} meeting${top.ids.length === 1 ? "" : "s"}, ${top.teams.length} team${top.teams.length === 1 ? "" : "s"}).`
            : "No recurring concern stands out."
        }${pos[0] ? ` The strongest positive signal is ${pos[0].label.toLowerCase()}.` : ""}`
      : "No meetings in this selection.",
    issues: neg.slice(0, 5).map((t) => ({ label: t.label, meetingIds: t.ids, teams: t.teams })),
    positives: pos.slice(0, 4).map((t) => ({ label: t.label, meetingIds: t.ids, teams: t.teams })),
    actions: neg.slice(0, 3).map((t) => THEME_RECS[t.label] ?? `Review ${t.label.toLowerCase()} with the teams involved.`),
  };
}

const clip = (s: string, n = 280) => (s.length > n ? `${s.slice(0, n)}…` : s);

export async function analyticsInsights(meetings: MeetingRecord[]): Promise<{ insights: AnalyticsInsights } & AiMeta> {
  const c = aiConfig();
  // Most recent 300 meetings, each note clipped: keeps a large history within one request.
  const sample = [...meetings]
    .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
    .slice(0, 300)
    .map((m) => ({
      id: m.id,
      date: m.meetingDate,
      department: m.department,
      team: m.team,
      type: m.meetingType,
      positive: clip(m.positive),
      concerns: clip(m.risk),
      negative: clip(m.negative),
    }));
  const known = new Set(sample.map((m) => m.id));
  const teamOf = new Map(sample.map((m) => [m.id, m.team]));

  const out = await withFallback(
    () =>
      cached("analytics-insights", c.model, sample, async () => {
        if (!sample.length) return localInsights([]);
        const r = await chatJson<{
          summary: string;
          recurring_issues: Array<{ theme: string; meeting_ids: string[] }>;
          positive_trends: Array<{ theme: string; meeting_ids: string[] }>;
          recommended_actions: string[];
        }>(
          `${PRIVACY} You are given ER meeting notes across an organisation. Find the recurring concerns ` +
            "(at most 5, most frequent first) and positive trends (at most 4), each with a short theme name (2-5 words) " +
            "and the ids of the meetings that mention it. Then give up to 3 concrete actions for HR and management. " +
            "Start with a 2-3 sentence summary for HR leadership.",
          JSON.stringify(sample),
          "analytics_insights",
          obj({
            summary: str,
            recurring_issues: { type: "array", items: obj({ theme: str, meeting_ids: strList }) },
            positive_trends: { type: "array", items: obj({ theme: str, meeting_ids: strList }) },
            recommended_actions: strList,
          }),
        );
        const theme = (t: { theme: string; meeting_ids: string[] }): InsightTheme => {
          const ids = [...new Set(t.meeting_ids.filter((id) => known.has(id)))];
          return { label: t.theme, meetingIds: ids, teams: [...new Set(ids.map((id) => teamOf.get(id)!))] };
        };
        return {
          summary: r.summary,
          issues: r.recurring_issues.slice(0, 5).map(theme).filter((t) => t.meetingIds.length),
          positives: r.positive_trends.slice(0, 4).map(theme).filter((t) => t.meetingIds.length),
          actions: r.recommended_actions.slice(0, 3),
        };
      }),
    () => localInsights(meetings),
  );
  return { insights: out.result, source: out.source, model: out.model, notice: out.notice };
}

/* ---------- Voice transcription ---------- */

const LANG_CODES: Record<string, string> = { English: "en", "Egyptian Arabic": "ar", Arabic: "ar" };

export async function transcribe(audio: Blob, language: string): Promise<{ text: string } & AiMeta> {
  const c = aiConfig();
  if (!c.enabled) {
    throw new Error("Voice transcription needs an OpenAI key (OPENAI_API_KEY). Type the transcript instead.");
  }
  const form = new FormData();
  form.append("file", audio, "voice-note.webm");
  form.append("model", c.transcribeModel);
  const code = LANG_CODES[language];
  if (code) form.append("language", code);
  const res = await fetch(`${c.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.key}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status}). ${detail.slice(0, 160)}`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: (data.text ?? "").trim(), source: "openai", model: c.transcribeModel };
}
