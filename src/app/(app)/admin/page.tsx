import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { listManagers } from "@/repositories/employees";
import { listUsers } from "@/repositories/users";
import { AdminView } from "./components/AdminView";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    redirect("/meetings");
  }

  const [users, managers] = await Promise.all([listUsers(), listManagers()]);

  return <AdminView users={users} managers={managers} />;
}
