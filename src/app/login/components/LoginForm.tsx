"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { useT } from "@/components/i18n/lang";
import { Button } from "@/components/ui/button";

const field =
  "h-10 rounded-[6px] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";

export function LoginForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const errorText =
    state?.error === "Invalid email or password."
      ? t("Invalid email or password.", "البريد الإلكتروني أو كلمة المرور غير صحيحين.")
      : state?.error;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("Email", "البريد الإلكتروني")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          dir="ltr"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("Password", "كلمة المرور")}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className={field}
        />
      </label>
      {state?.error ? (
        <p
          className="rounded-[6px] bg-[#ffedea] px-3 py-2 text-[13px] text-[#831c1e]"
          role="alert"
        >
          {errorText}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        aria-label={t("Sign in to Relations Hub", "تسجيل الدخول إلى Relations Hub")}
        disabled={pending}
        className="mt-2 h-10 w-full"
      >
        {pending ? t("Signing in…", "جارٍ تسجيل الدخول…") : t("Sign in", "تسجيل الدخول")}
      </Button>
    </form>
  );
}
