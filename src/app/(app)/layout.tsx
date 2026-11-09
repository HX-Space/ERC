import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { viewsForRole } from "@/lib/rbac";
import { isOverdue } from "@/lib/followups";
import { ROLE_LABELS } from "@/lib/constants";
import { APP_TIMEZONE } from "@/lib/format";
import { listFollowups } from "@/repositories/followups";
import { AppShell } from "@/components/shell/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const followups = await listFollowups();
  const overdueCount = followups.filter((f) => isOverdue(f)).length;
  const items = viewsForRole(session.user.role);
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });

  return (
    <AppShell
      items={items}
      overdueCount={overdueCount}
      userName={session.user.name ?? session.user.email ?? ""}
      roleLabel={ROLE_LABELS[session.user.role]}
      todayLabel={todayLabel}
    >
      {children}
    </AppShell>
  );
}
