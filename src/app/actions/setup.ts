"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { createFirstAdmin } from "@/repositories/users";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(10, "Use at least 10 characters for the password."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

export async function setupAdminAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const t = await getT();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("Check the form.", "تحقق من النموذج.") };
  }

  const created = await createFirstAdmin(parsed.data);
  if (!created) {
    return {
      error: t("An admin account already exists. Sign in instead.", "يوجد حساب مسؤول بالفعل. سجّل الدخول بدلاً من ذلك."),
    };
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirect: false,
  });
  redirect("/admin");
}
