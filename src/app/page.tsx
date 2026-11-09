import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { homeForRole } from "@/lib/rbac";

/** Bare `/` always resolves to the role home path so the URL matches the page. */
export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  redirect(homeForRole(session.user.role));
}
