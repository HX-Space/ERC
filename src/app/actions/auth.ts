"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { query } from "@/lib/db";
import { getT } from "@/lib/i18n-server";
import { homeForRole } from "@/lib/rbac";
import type { UserRole } from "@/types";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const t = await getT();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { error: t("Invalid email or password.", "البريد الإلكتروني أو كلمة المرور غير صحيحة.") };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: t("Invalid email or password.", "البريد الإلكتروني أو كلمة المرور غير صحيحة.") };
    }
    throw error;
  }

  const user = await query<{ role: UserRole }>(
    `SELECT role FROM employee_relations_users WHERE lower(email) = lower($1) AND is_active = TRUE LIMIT 1`,
    [email],
  );

  const role = user.rows[0]?.role;
  redirect(role ? homeForRole(role) : "/meetings");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
