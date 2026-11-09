"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { FEEDBACK_CYCLE } from "@/lib/constants";
import { getEmployee } from "@/repositories/employees";
import { getLatestFeedback, upsertFeedback } from "@/repositories/feedback";
import type { FeedbackAiSummary, FeedbackMode, FeedbackStatus } from "@/types";

export async function saveFeedbackAction(input: {
  employeeCode: string;
  managerCode: string;
  mode: FeedbackMode;
  body: string;
  language: string | null;
  hasAudio: boolean;
  status: FeedbackStatus;
  aiSummary: FeedbackAiSummary | null;
  existingId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in." };

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return { ok: false, error: "Only managers can submit feedback." };
  }

  const managerCode =
    role === "ADMIN" ? input.managerCode : session.user.managerCode;
  if (!managerCode) {
    return { ok: false, error: "No manager profile linked to this account." };
  }
  if (role === "MANAGER" && managerCode !== input.managerCode) {
    return { ok: false, error: "You can only submit feedback for your own team." };
  }
  const employee = await getEmployee(input.employeeCode);
  if (!employee || employee.managerCode !== managerCode) {
    return { ok: false, error: "This employee is not in that manager's team." };
  }
  const latest = await getLatestFeedback(input.employeeCode, managerCode, FEEDBACK_CYCLE);
  if (latest?.status === "Submitted") {
    return { ok: false, error: "Feedback for this employee was already submitted this cycle." };
  }
  if (input.status !== "Draft" && input.status !== "Submitted") {
    return { ok: false, error: "Unknown feedback status." };
  }
  input = { ...input, existingId: latest?.status === "Draft" ? latest.id : undefined };
  if (!input.body.trim()) {
    return { ok: false, error: "Add feedback text before saving." };
  }

  await upsertFeedback({
    ...input,
    managerCode,
    cycle: FEEDBACK_CYCLE,
  });

  revalidatePath("/feedback");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return { ok: true };
}
