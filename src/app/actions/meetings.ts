"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { canCreateMeetings } from "@/lib/rbac";
import { createMeeting } from "@/repositories/meetings";
import { htmlToText } from "@/lib/rich-text";
import { cleanRichText } from "@/lib/rich-text-server";
import type { CreateMeetingInput, MeetingChannel, MeetingType, PulseScores } from "@/types";

export async function createMeetingAction(input: {
  meetingDate: string;
  meetingType: MeetingType;
  channel: MeetingChannel;
  department: string;
  unit: string;
  team: string;
  employeeCodes: string[];
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  pulse: PulseScores | null;
  pulseNote: string;
  aiSummary: string;
  followups: Array<{ item: string; targetDate: string }>;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = await getT();
  const session = await auth();
  if (!session?.user || !canCreateMeetings(session.user.role)) {
    return {
      ok: false,
      error: t("You do not have permission to create meetings.", "ليست لديك صلاحية لإنشاء اجتماعات."),
    };
  }
  if (!input.employeeCodes.length) {
    return { ok: false, error: t("Add at least one employee before saving.", "أضف موظفاً واحداً على الأقل قبل الحفظ.") };
  }
  const clean = {
    positive: cleanRichText(input.positive),
    risk: cleanRichText(input.risk),
    negative: cleanRichText(input.negative),
    recommendation: cleanRichText(input.recommendation),
    followUpNote: cleanRichText(input.followUpNote),
  };
  if (!Object.values(clean).some((t) => htmlToText(t).trim())) {
    return { ok: false, error: t("Write at least one outcome before saving.", "اكتب نتيجة واحدة على الأقل قبل الحفظ.") };
  }

  const payload: CreateMeetingInput = {
    ...input,
    ...clean,
    createdBy: session.user.id,
  };

  const meeting = await createMeeting(payload);
  revalidatePath("/meetings");
  revalidatePath("/follow-ups");
  revalidatePath("/employees");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
  return { ok: true, id: meeting.id };
}
