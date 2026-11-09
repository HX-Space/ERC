import { redirect } from "next/navigation";
import { BrandMark } from "@/components/shell/app-sidebar";
import { countUsers } from "@/repositories/users";
import { SetupForm } from "./components/SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Setup exists only for an empty database.
  if ((await countUsers()) > 0) redirect("/login");

  return (
    <main className="login-shell flex min-h-dvh flex-col px-6 py-6 md:px-12 md:py-10">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-7" />
        <span className="text-[14px] font-semibold">Relations Hub</span>
      </div>

      <div className="my-auto w-full max-w-[400px] self-center py-12">
        <h1 className="text-[22px] leading-7 font-semibold">Create the admin account</h1>
        <p className="mt-1 text-[14px] text-muted">
          This workspace has no users yet. The first account becomes the administrator. It can
          then add managers and employees and create accounts for ER, HR and managers.
        </p>
        <div className="mt-7">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
