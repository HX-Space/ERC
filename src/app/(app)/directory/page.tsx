import { auth } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { listEmployees, listManagers } from "@/repositories/employees";
import { DirectoryView } from "./components/DirectoryView";

export default async function DirectoryPage() {
  const session = await auth();
  const [employees, managers] = await Promise.all([listEmployees(), listManagers()]);

  return (
    <DirectoryView
      employees={employees}
      managers={managers}
      isAdmin={!!session?.user && canManageUsers(session.user.role)}
    />
  );
}
