"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { canCloseFollowups } from "@/lib/rbac";
import { closeFollowup } from "@/repositories/followups";

export async function closeFollowupAction(
  id: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getT();
  const session = await auth();
  if (!session?.user || !canCloseFollowups(session.user.role)) {
    return {
      ok: false,
      error: t("Only ERCs and admins can close follow-ups.", "يقتصر إغلاق المتابعات على ERC والمسؤولين."),
    };
  }
  await closeFollowup(id, note);
  revalidatePath("/follow-ups");
  revalidatePath("/meetings");
  revalidatePath("/employees");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
  return { ok: true };
}
