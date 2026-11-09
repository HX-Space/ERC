"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { listManagers } from "@/repositories/employees";
import {
  createUser,
  setUserActive,
  updateUserRole,
} from "@/repositories/users";
import type { UserRole } from "@/types";

type Result = { ok: true } | { ok: false; error: string };

const ROLES = ["ADMIN", "ER", "HR", "MANAGER"] as const;

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Temporary password: at least 10 characters."),
  role: z.enum(ROLES),
  managerCode: z.string().trim().nullable().optional(),
});

async function adminSession() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) return null;
  return session.user;
}

async function checkManagerLink(role: UserRole, managerCode: string | null | undefined) {
  if (role !== "MANAGER") return null;
  if (!managerCode) return "Choose which manager in the directory this account belongs to.";
  const managers = await listManagers();
  if (!managers.some((m) => m.code === managerCode)) return "That manager code is not in the directory.";
  return null;
}

export async function createUserAction(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  managerCode?: string | null;
}): Promise<Result> {
  if (!(await adminSession())) return { ok: false, error: "Admin access required." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const linkError = await checkManagerLink(parsed.data.role, parsed.data.managerCode);
  if (linkError) return { ok: false, error: linkError };

  try {
    await createUser({
      ...parsed.data,
      managerCode: parsed.data.role === "MANAGER" ? parsed.data.managerCode : null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (/users_email_key|duplicate key/i.test(msg)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    return { ok: false, error: "Could not create the user." };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUserRoleAction(input: {
  id: string;
  role: UserRole;
  managerCode: string | null;
}): Promise<Result> {
  const me = await adminSession();
  if (!me) return { ok: false, error: "Admin access required." };
  if (input.id === me.id && input.role !== "ADMIN") {
    return { ok: false, error: "You cannot remove your own admin role." };
  }
  if (!ROLES.includes(input.role)) return { ok: false, error: "Unknown role." };
  const linkError = await checkManagerLink(input.role, input.managerCode);
  if (linkError) return { ok: false, error: linkError };

  await updateUserRole(input.id, input.role, input.role === "MANAGER" ? input.managerCode : null);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserActiveAction(id: string, isActive: boolean): Promise<Result> {
  const me = await adminSession();
  if (!me) return { ok: false, error: "Admin access required." };
  if (id === me.id && !isActive) {
    return { ok: false, error: "You cannot disable your own account." };
  }
  await setUserActive(id, isActive);
  revalidatePath("/admin");
  return { ok: true };
}
