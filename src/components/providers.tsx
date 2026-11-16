"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/ui/toast";
import { LangProvider } from "@/components/i18n/lang";
import type { Lang } from "@/lib/i18n";

export function Providers({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <LangProvider lang={lang}>
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SessionProvider>
    </LangProvider>
  );
}
