"use server";

import { auth } from "@/lib/auth";
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
import { listMeetings } from "@/repositories/meetings";
import type { FeedbackAiSummary } from "@/types";

type Fail = { ok: false; error: string };

const MAX_NOTE = 8_000;

export async function assistMeetingAction(
  notes: MeetingNotes,
): Promise<({ ok: true } & MeetingAiAssist & AiMeta) | Fail> {
  const session = await auth();
  if (!session?.user || !canCreateMeetings(session.user.role)) {
    return { ok: false, error: "Only ER specialists and admins can use the meeting assistant." };
  }
  const fields = [notes.positive, notes.risk, notes.negative, notes.recommendation, notes.followUpNote];
  if (!fields.some((t) => t?.trim())) {
    return { ok: false, error: "Write the meeting outcomes first. The assistant only works from your notes." };
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
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return { ok: false, error: "Only managers can organise feedback." };
  }
  if (!body.trim()) return { ok: false, error: "Add feedback text first." };
  return { ok: true, ...(await feedbackSummary(body.slice(0, MAX_NOTE))) };
}

export async function analyticsInsightsAction(
  meetingIds: string[],
): Promise<({ ok: true; insights: AnalyticsInsights } & AiMeta) | Fail> {
  const session = await auth();
  if (!session?.user || !canAccessView(session.user.role, "analytics")) {
    return { ok: false, error: "Analytics access required." };
  }
  const wanted = new Set(meetingIds);
  const meetings = (await listMeetings()).filter((m) => wanted.has(m.id));
  return { ok: true, ...(await analyticsInsights(meetings)) };
}
