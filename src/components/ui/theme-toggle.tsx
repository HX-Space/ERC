"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/format";
import { useT } from "@/components/i18n/lang";

export function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  const dark = resolvedTheme === "dark";

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      type="button"
      aria-label={
        dark
          ? t("Switch to light theme", "التبديل إلى المظهر الفاتح")
          : t("Switch to dark theme", "التبديل إلى المظهر الداكن")
      }
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-muted outline-none transition-colors hover:bg-active hover:text-ink",
        className,
      )}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-4" strokeWidth={1.6} /> : <Moon className="size-4" strokeWidth={1.6} />}
    </motion.button>
  );
}
