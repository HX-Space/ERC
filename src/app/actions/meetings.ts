"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canCreateMeetings } from "@/lib/rbac";
import { createMeeting } from "@/repositories/meetings";
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
  const session = await auth();
  if (!session?.user || !canCreateMeetings(session.user.role)) {
    return { ok: false, error: "You do not have permission to create meetings." };
  }
  if (!input.employeeCodes.length) {
    return { ok: false, error: "Add at least one employee before saving." };
  }
  if (
    ![
      input.positive,
      input.risk,
      input.negative,
      input.recommendation,
      input.followUpNote,
    ].some((t) => t.trim())
  ) {
    return { ok: false, error: "Write at least one outcome before saving." };
  }

  const payload: CreateMeetingInput = {
    ...input,
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
