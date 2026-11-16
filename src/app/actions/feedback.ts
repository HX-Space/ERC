"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { FEEDBACK_CYCLE } from "@/lib/constants";
import { getT } from "@/lib/i18n-server";
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
  const t = await getT();
  const session = await auth();
  if (!session?.user) return { ok: false, error: t("Not signed in.", "لم يتم تسجيل الدخول.") };

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return { ok: false, error: t("Only managers can submit feedback.", "يمكن للمديرين إرسال الملاحظات فقط.") };
  }

  const managerCode =
    role === "ADMIN" ? input.managerCode : session.user.managerCode;
  if (!managerCode) {
    return {
      ok: false,
      error: t("No manager profile linked to this account.", "لا يوجد ملف مدير مرتبط بهذا الحساب."),
    };
  }
  if (role === "MANAGER" && managerCode !== input.managerCode) {
    return {
      ok: false,
      error: t("You can only submit feedback for your own team.", "يمكنك إرسال الملاحظات لفريقك فقط."),
    };
  }
  const employee = await getEmployee(input.employeeCode);
  if (!employee || employee.managerCode !== managerCode) {
    return { ok: false, error: t("This employee is not in that manager's team.", "هذا الموظف ليس ضمن فريق هذا المدير.") };
  }
  const latest = await getLatestFeedback(input.employeeCode, managerCode, FEEDBACK_CYCLE);
  if (latest?.status === "Submitted") {
    return {
      ok: false,
      error: t(
        "Feedback for this employee was already submitted this cycle.",
        "تم إرسال ملاحظات هذا الموظف في هذه الدورة بالفعل.",
      ),
    };
  }
  if (input.status !== "Draft" && input.status !== "Submitted") {
    return { ok: false, error: t("Unknown feedback status.", "حالة الملاحظات غير معروفة.") };
  }
  input = { ...input, existingId: latest?.status === "Draft" ? latest.id : undefined };
  if (!input.body.trim()) {
    return { ok: false, error: t("Add feedback text before saving.", "أضف نص الملاحظات قبل الحفظ.") };
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
