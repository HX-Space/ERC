"use client";

import { useActionState } from "react";
import { setupAdminAction } from "@/app/actions/setup";
import { useT } from "@/components/i18n/lang";
import { Button } from "@/components/ui/button";

const field =
  "h-10 rounded-[6px] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";

const KNOWN_ERRORS: Record<string, [string, string]> = {
  "Enter your full name.": ["Enter your full name.", "أدخل اسمك الكامل."],
  "Enter a valid email address.": ["Enter a valid email address.", "أدخل عنوان بريد إلكتروني صالحاً."],
  "Use at least 10 characters for the password.": [
    "Use at least 10 characters for the password.",
    "استخدم 10 أحرف على الأقل لكلمة المرور.",
  ],
  "The two passwords do not match.": ["The two passwords do not match.", "كلمتا المرور غير متطابقتين."],
  "An admin account already exists. Sign in instead.": [
    "An admin account already exists. Sign in instead.",
    "يوجد حساب مسؤول بالفعل. سجّل الدخول بدلاً من ذلك.",
  ],
  "Check the form.": ["Check the form.", "راجع النموذج."],
};

export function SetupForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(setupAdminAction, undefined);
  const known = state?.error ? KNOWN_ERRORS[state.error] : undefined;
  const errorText = known ? t(known[0], known[1]) : state?.error;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("Full name", "الاسم الكامل")}</span>
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("Work email", "البريد الإلكتروني للعمل")}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
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
          minLength={10}
          autoComplete="new-password"
          aria-describedby="pw-rule"
          dir="ltr"
          className={field}
        />
        <span id="pw-rule" className="text-[12px] text-muted">
          {t("At least 10 characters.", "10 أحرف على الأقل.")}
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("Confirm password", "تأكيد كلمة المرور")}</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          dir="ltr"
          className={field}
        />
      </label>
      {state?.error ? (
        <p className="rounded-[6px] bg-[#ffedea] px-3 py-2 text-[13px] text-[#831c1e]" role="alert">
          {errorText}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        aria-label={t("Create admin account", "إنشاء حساب المسؤول")}
        disabled={pending}
        className="mt-2 h-10 w-full"
      >
        {pending ? t("Creating…", "جارٍ الإنشاء…") : t("Create admin account", "إنشاء حساب المسؤول")}
      </Button>
    </form>
  );
}
