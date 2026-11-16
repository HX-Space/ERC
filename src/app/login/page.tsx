import { redirect } from "next/navigation";
import { BrandMark } from "@/components/shell/app-sidebar";
import { LangToggle } from "@/components/i18n/lang";
import { getT } from "@/lib/i18n-server";
import { countUsers } from "@/repositories/users";
import { LoginForm } from "./components/LoginForm";

export const dynamic = "force-dynamic";

const MODULES = [
  [
    "Meetings",
    "الاجتماعات",
    "Individual and group ER meetings with pulse reviews",
    "اجتماعات فردية وجماعية لعلاقات الموظفين مع مراجعات النبض",
  ],
  [
    "Follow-ups",
    "المتابعات",
    "Every action raised, tracked to its target date",
    "كل إجراء يُرفع ويُتابع حتى تاريخه المستهدف",
  ],
  [
    "History",
    "السجل",
    "One timeline per employee: meetings and manager feedback",
    "خط زمني واحد لكل موظف: الاجتماعات وملاحظات المديرين",
  ],
  [
    "Analytics",
    "التحليلات",
    "Concerns and themes by department, for HR",
    "المخاوف والمحاور حسب القسم، للموارد البشرية",
  ],
] as const;

export default async function LoginPage() {
  // A fresh database has no accounts yet: send the first visitor to setup.
  if ((await countUsers()) === 0) redirect("/setup");
  const t = await getT();

  return (
    <main className="login-shell grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col px-6 py-6 md:px-12 md:py-10">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-7" />
            <span className="text-[14px] font-semibold">Relations Hub</span>
          </div>
          <LangToggle />
        </div>

        <div className="my-auto w-full max-w-[360px] self-center py-12">
          <h1 className="text-[22px] leading-7 font-semibold">{t("Sign in", "تسجيل الدخول")}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {t(
              "Use your organisation email and password.",
              "استخدم البريد الإلكتروني وكلمة المرور الخاصين بالمؤسسة.",
            )}
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </div>

        <p className="text-[12px] text-muted">
          {t(
            "Restricted to authorised ERC, HR and management staff.",
            "مقصور على موظفي علاقات الموظفين والموارد البشرية والإدارة المصرّح لهم.",
          )}
        </p>
      </section>

      <section
        aria-label={t("About Relations Hub", "نبذة عن Relations Hub")}
        className="hidden flex-col justify-center bg-[#10272d] px-12 py-10 text-[#e6eef0] lg:flex xl:px-20"
      >
        <p className="max-w-md text-[28px] leading-[34px] font-medium tracking-[-0.01em] text-white">
          {t(
            "The confidential record of every employee relations conversation.",
            "السجل السري لكل محادثة في علاقات الموظفين.",
          )}
        </p>
        <ul className="mt-10 flex max-w-md flex-col">
          {MODULES.map(([name, nameAr, text, textAr]) => (
            <li key={name} className="border-t border-white/12 py-3.5">
              <p className="text-[14px] font-medium text-white">{t(name, nameAr)}</p>
              <p className="mt-0.5 text-[14px] text-[#a9c1c6]">{t(text, textAr)}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
