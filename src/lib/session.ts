import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessView, homeForRole } from "@/lib/rbac";
import type { AppView, SessionUser } from "@/types";

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    role: user.role,
    managerCode: user.managerCode ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireView(view: AppView): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessView(user.role, view)) redirect(homeForRole(user.role));
  return user;
}
