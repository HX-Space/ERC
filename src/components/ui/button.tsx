"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/format";

type Variant = "primary" | "ghost" | "danger" | "ai" | "default";

const styles: Record<Variant, string> = {
  primary: "border-transparent bg-primary text-primary-ink hover:opacity-90",
  ghost: "border-transparent bg-transparent text-ink hover:bg-surface-2",
  danger: "border-line-2 bg-surface text-risk hover:border-risk/40 hover:bg-risk-soft",
  ai: "border-line-2 bg-surface text-ai hover:bg-ai-soft",
  default: "border-line-2 bg-surface text-ink hover:bg-surface-2",
};

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-[background-color,border-color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4",
        styles[variant],
        size === "sm" && "h-8 px-2.5 text-[13px]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
