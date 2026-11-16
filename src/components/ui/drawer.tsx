"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLang, useT } from "@/components/i18n/lang";

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  width = 720,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width in px (full width on small screens). */
  width?: number;
}) {
  const t = useT();
  const lang = useLang();
  // In Arabic (RTL) the panel sits on the left, so it slides in from the left.
  const offscreen = lang === "ar" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={t("Close panel backdrop", "إغلاق خلفية اللوحة")}
            className="fixed inset-0 z-40 cursor-pointer bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-y-0 end-0 z-50 flex w-full flex-col border-s border-line bg-surface shadow-[var(--shadow-float)]"
            style={{ maxWidth: width }}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-6 py-3.5">
              <h2 className="text-[17px] font-semibold">
                {title}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("Close panel", "إغلاق اللوحة")}
                onClick={onClose}
              >
                {t("Close", "إغلاق")}
              </Button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">{children}</div>
            {footer ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-6 py-4">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
