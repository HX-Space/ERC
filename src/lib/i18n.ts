/**
 * Two UI languages. Strings are written inline at the call site: t("English", "العربية").
 * Server components: `const t = await getT()` (src/lib/i18n-server.ts).
 * Client components: `const t = useT()` / `const lang = useLang()` (src/components/i18n/lang.tsx).
 */
export type Lang = "en" | "ar";
export type T = (en: string, ar: string) => string;

export const LANG_COOKIE = "lang";

export function parseLang(value: string | undefined | null): Lang {
  return value === "ar" ? "ar" : "en";
}

export function makeT(lang: Lang): T {
  return (en, ar) => (lang === "ar" ? ar : en);
}

/** Locale for dates and numbers. Latin digits in both languages so figures stay comparable. */
export function localeFor(lang: Lang): string {
  return lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
}
