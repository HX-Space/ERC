import {
  listDepartments,
  listEmployees,
} from "@/repositories/employees";
import { listFollowups } from "@/repositories/followups";
import { listMeetings } from "@/repositories/meetings";
import { AnalyticsView } from "./components/AnalyticsView";

export default async function AnalyticsPage() {
  const [meetings, followups, employees, departments] = await Promise.all([
    listMeetings(),
    listFollowups(),
    listEmployees(),
    listDepartments(),
  ]);

  return (
    <AnalyticsView
      meetings={meetings}
      followups={followups}
      employees={employees}
      departments={departments}
    />
  );
}
