import { redirect } from "next/navigation";
import { BrandMark } from "@/components/shell/app-sidebar";
import { countUsers } from "@/repositories/users";
import { LoginForm } from "./components/LoginForm";

export const dynamic = "force-dynamic";

const MODULES = [
  ["Meetings", "Individual and group ER meetings with pulse reviews"],
  ["Follow-ups", "Every action raised, tracked to its target date"],
  ["History", "One timeline per employee: meetings and manager feedback"],
  ["Analytics", "Concerns and themes by department, for HR"],
] as const;

export default async function LoginPage() {
  // A fresh database has no accounts yet: send the first visitor to setup.
  if ((await countUsers()) === 0) redirect("/setup");

  return (
    <main className="login-shell grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col px-6 py-6 md:px-12 md:py-10">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="text-[14px] font-semibold">Relations Hub</span>
        </div>

        <div className="my-auto w-full max-w-[360px] self-center py-12">
          <h1 className="text-[22px] leading-7 font-semibold">Sign in</h1>
          <p className="mt-1 text-[14px] text-muted">
            Use your organisation email and password.
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </div>

        <p className="text-[12px] text-muted">
          Restricted to authorised ER, HR and management staff.
        </p>
      </section>

      <section
        aria-label="About Relations Hub"
        className="hidden flex-col justify-center bg-[#10272d] px-12 py-10 text-[#e6eef0] lg:flex xl:px-20"
      >
        <p className="max-w-md text-[28px] leading-[34px] font-medium tracking-[-0.01em] text-white">
          The confidential record of every employee relations conversation.
        </p>
        <ul className="mt-10 flex max-w-md flex-col">
          {MODULES.map(([name, text]) => (
            <li key={name} className="border-t border-white/12 py-3.5">
              <p className="text-[14px] font-medium text-white">{name}</p>
              <p className="mt-0.5 text-[14px] text-[#a9c1c6]">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
