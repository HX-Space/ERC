import { auth } from "@/lib/auth";
import { canCloseFollowups } from "@/lib/rbac";
import {
  listDepartments,
  listEmployees,
  listTitles,
} from "@/repositories/employees";
import { listFeedbackForEmployee } from "@/repositories/feedback";
import { listFollowupsForEmployee } from "@/repositories/followups";
import { listMeetingsForEmployee } from "@/repositories/meetings";
import { EmployeesView } from "./components/EmployeesView";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const employees = await listEmployees();
  const code = params.code || employees[0]?.code || "";
  const [departments, titles, meetings, feedback, followups] = await Promise.all([
    listDepartments(),
    listTitles(),
    code ? listMeetingsForEmployee(code) : Promise.resolve([]),
    code ? listFeedbackForEmployee(code) : Promise.resolve([]),
    code ? listFollowupsForEmployee(code) : Promise.resolve([]),
  ]);

  return (
    <EmployeesView
      employees={employees}
      departments={departments}
      titles={titles}
      selectedCode={code}
      meetings={meetings}
      feedback={feedback}
      followups={followups}
      canClose={canCloseFollowups(session!.user.role)}
    />
  );
}
