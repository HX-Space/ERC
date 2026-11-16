"use server";

import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { canAccessView, canCreateMeetings } from "@/lib/rbac";
import {
  analyticsInsights,
  feedbackSummary,
  meetingAssist,
  type AiMeta,
  type AnalyticsInsights,
  type MeetingNotes,
} from "@/lib/ai-server";
import type { MeetingAiAssist } from "@/lib/ai";
import { htmlToText } from "@/lib/rich-text";
import { listMeetings } from "@/repositories/meetings";
import type { FeedbackAiSummary } from "@/types";

type Fail = { ok: false; error: string };

const MAX_NOTE = 8_000;

export async function assistMeetingAction(
  notes: MeetingNotes,
): Promise<({ ok: true } & MeetingAiAssist & AiMeta) | Fail> {
  const t = await getT();
  const session = await auth();
  if (!session?.user || !canCreateMeetings(session.user.role)) {
    return {
      ok: false,
      error: t(
        "Only ERCs and admins can use the meeting assistant.",
        "يقتصر استخدام مساعد الاجتماعات على ERC والمسؤولين.",
      ),
    };
  }
  // The outcome editor sends HTML; the assistant reads plain text.
  notes = {
    ...notes,
    positive: htmlToText(notes.positive ?? ""),
    risk: htmlToText(notes.risk ?? ""),
    negative: htmlToText(notes.negative ?? ""),
    recommendation: htmlToText(notes.recommendation ?? ""),
    followUpNote: htmlToText(notes.followUpNote ?? ""),
  };
  const fields = [notes.positive, notes.risk, notes.negative, notes.recommendation, notes.followUpNote];
  if (!fields.some((t) => t?.trim())) {
    return {
      ok: false,
      error: t(
        "Write the meeting outcomes first. The assistant only works from your notes.",
        "اكتب نتائج الاجتماع أولاً. يعمل المساعد انطلاقاً من ملاحظاتك فقط.",
      ),
    };
  }
  const clipped: MeetingNotes = {
    positive: notes.positive.slice(0, MAX_NOTE),
    risk: notes.risk.slice(0, MAX_NOTE),
    negative: notes.negative.slice(0, MAX_NOTE),
    recommendation: notes.recommendation.slice(0, MAX_NOTE),
    followUpNote: notes.followUpNote.slice(0, MAX_NOTE),
    meetingDate: notes.meetingDate,
  };
  return { ok: true, ...(await meetingAssist(clipped)) };
}

export async function organizeFeedbackAction(
  body: string,
): Promise<({ ok: true; summary: FeedbackAiSummary } & AiMeta) | Fail> {
  const t = await getT();
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return { ok: false, error: t("Only managers can organise feedback.", "يقتصر تنظيم الملاحظات على المديرين.") };
  }
  if (!body.trim()) return { ok: false, error: t("Add feedback text first.", "أضف نص الملاحظات أولاً.") };
  return { ok: true, ...(await feedbackSummary(body.slice(0, MAX_NOTE))) };
}

export async function analyticsInsightsAction(
  meetingIds: string[],
): Promise<({ ok: true; insights: AnalyticsInsights } & AiMeta) | Fail> {
  const t = await getT();
  const session = await auth();
  if (!session?.user || !canAccessView(session.user.role, "analytics")) {
    return { ok: false, error: t("Analytics access required.", "تتطلب صلاحية الوصول إلى التحليلات.") };
  }
  const wanted = new Set(meetingIds);
  const meetings = (await listMeetings()).filter((m) => wanted.has(m.id));
  return { ok: true, ...(await analyticsInsights(meetings)) };
}
