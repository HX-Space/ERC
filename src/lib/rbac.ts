import { ROLE_HOME, ROLE_VIEWS, VIEW_META } from "@/lib/constants";
import type { AppView, UserRole } from "@/types";

export function canAccessView(role: UserRole, view: AppView): boolean {
  return ROLE_VIEWS[role].includes(view);
}

export function viewsForRole(role: UserRole) {
  return ROLE_VIEWS[role].map((view) => ({
    view,
    ...VIEW_META[view],
  }));
}

export function homeForRole(role: UserRole): string {
  return ROLE_HOME[role];
}

export function pathToView(pathname: string): AppView | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return null;
  const match = (Object.keys(VIEW_META) as AppView[]).find(
    (view) => VIEW_META[view].href === `/${segment}`,
  );
  return match ?? null;
}

export function canCloseFollowups(role: UserRole): boolean {
  return role === "ADMIN" || role === "ER";
}

export function canCreateMeetings(role: UserRole): boolean {
  return role === "ADMIN" || role === "ER";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}
