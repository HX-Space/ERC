import { auth } from "@/lib/auth";
import { canCloseFollowups } from "@/lib/rbac";
import { listFollowups } from "@/repositories/followups";
import { FollowupsView } from "./components/FollowupsView";

const FILTERS = ["Open", "Overdue", "Closed", "All"] as const;

export default async function FollowupsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  const { filter } = await searchParams;
  const initialFilter = FILTERS.find((f) => f.toLowerCase() === filter?.toLowerCase()) ?? "Open";
  const followups = await listFollowups();

  return (
    <FollowupsView
      followups={followups}
      canClose={canCloseFollowups(session!.user.role)}
      initialFilter={initialFilter}
    />
  );
}
