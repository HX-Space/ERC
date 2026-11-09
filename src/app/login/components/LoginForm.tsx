"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const field =
  "h-10 rounded-[6px] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </label>
      {state?.error ? (
        <p
          className="rounded-[6px] bg-[#ffedea] px-3 py-2 text-[13px] text-[#831c1e]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        aria-label="Sign in to Relations Hub"
        disabled={pending}
        className="mt-2 h-10 w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
