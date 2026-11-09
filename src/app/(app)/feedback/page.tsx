import { auth } from "@/lib/auth";
import { FEEDBACK_CYCLE } from "@/lib/constants";
import { listEmployees, listManagers } from "@/repositories/employees";
import { listFeedbackForManager } from "@/repositories/feedback";
import { FeedbackView } from "./components/FeedbackView";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ mgr?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const managers = await listManagers();

  const managerCode =
    session!.user.role === "ADMIN"
      ? params.mgr || session!.user.managerCode || managers[0]?.code || ""
      : session!.user.managerCode || "";

  const [team, feedback] = await Promise.all([
    listEmployees({ managerCode, status: "Active" }),
    managerCode
      ? listFeedbackForManager(managerCode, FEEDBACK_CYCLE)
      : Promise.resolve([]),
  ]);

  const manager = managers.find((m) => m.code === managerCode) ?? null;

  return (
    <FeedbackView
      managers={managers}
      manager={manager}
      team={team}
      feedback={feedback}
      isAdmin={session!.user.role === "ADMIN"}
      cycle={FEEDBACK_CYCLE}
    />
  );
}
