import { auth } from "@/lib/auth";
import { canCreateMeetings } from "@/lib/rbac";
import { listEmployees } from "@/repositories/employees";
import { isOverdue } from "@/lib/followups";
import { listFollowups } from "@/repositories/followups";
import { listMeetings } from "@/repositories/meetings";
import { MeetingsView } from "./components/MeetingsView";

export default async function MeetingsPage() {
  const session = await auth();
  const [meetings, followups, employees] = await Promise.all([
    listMeetings(),
    listFollowups(),
    listEmployees(),
  ]);

  return (
    <MeetingsView
      meetings={meetings}
      followups={followups}
      employees={employees}
      canCreate={canCreateMeetings(session!.user.role)}
      overdueCount={followups.filter((f) => isOverdue(f)).length}
    />
  );
}
