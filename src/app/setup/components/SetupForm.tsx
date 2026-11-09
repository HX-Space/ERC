"use client";

import { useActionState } from "react";
import { setupAdminAction } from "@/app/actions/setup";
import { Button } from "@/components/ui/button";

const field =
  "h-10 rounded-[6px] border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_16%,transparent)]";

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAdminAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Full name</span>
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Work email</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          aria-describedby="pw-rule"
          className={field}
        />
        <span id="pw-rule" className="text-[12px] text-muted">
          At least 10 characters.
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">Confirm password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className={field}
        />
      </label>
      {state?.error ? (
        <p className="rounded-[6px] bg-[#ffedea] px-3 py-2 text-[13px] text-[#831c1e]" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        aria-label="Create admin account"
        disabled={pending}
        className="mt-2 h-10 w-full"
      >
        {pending ? "Creating…" : "Create admin account"}
      </Button>
    </form>
  );
}
