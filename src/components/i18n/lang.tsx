"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

/** Switches the UI language: stores it in a cookie for a year and re-renders server components. */
export function useSetLang() {
  const router = useRouter();
  return (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    router.refresh();
  };
}

export function LangToggle({ className }: { className?: string }) {
  const lang = useLang();
  const setLang = useSetLang();
  const next: Lang = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      lang={next}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={lang === "ar" ? "English" : "العربية"}
      onClick={() => setLang(next)}
      className={
        className ??
        "inline-flex h-8 cursor-pointer items-center justify-center rounded-[6px] border border-line-2 px-2.5 text-[12px] font-medium text-muted outline-none hover:bg-surface-2 hover:text-ink"
      }
    >
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
}
