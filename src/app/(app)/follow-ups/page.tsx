import { auth } from "@/lib/auth";
import { canCloseFollowups } from "@/lib/rbac";
import { listFollowups } from "@/repositories/followups";
import { FollowupsView } from "./components/FollowupsView";

export default async function FollowupsPage() {
  const session = await auth();
  const followups = await listFollowups();

  return (
    <FollowupsView
      followups={followups}
      canClose={canCloseFollowups(session!.user.role)}
    />
  );
}
