"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/lib/followups";
import type { FollowupRecord } from "@/types";

export function CloseFollowupDialog({
  followup,
  open,
  pending,
  onClose,
  onConfirm,
}: {
  followup: FollowupRecord | null;
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open, followup?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && followup ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss close dialog"
            className="fixed inset-0 z-40 cursor-pointer bg-[#1a2030]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-followup-title"
            className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-line bg-surface p-5 shadow-[var(--shadow)]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="close-followup-title"
                  className="font-[family-name:var(--font-display)] text-lg tracking-[-0.02em]"
                >
                  Mark follow-up closed
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Records the action taken — not that the issue is resolved.
                </p>
              </div>
              <Pill tone={isOverdue(followup) ? "risk" : "info"}>
                {isOverdue(followup) ? "Overdue" : "Open"}
              </Pill>
            </div>

            <div className="mt-4 rounded-lg border border-line bg-bg px-3 py-3">
              <p className="text-sm font-medium text-ink">{followup.item}</p>
              <p className="mt-1 text-xs text-faint">
                <span className="mono text-ai">{followup.meetingId}</span>
                {" · "}
                Due {formatDate(followup.targetDate)}
                {followup.employeeNames?.length
                  ? ` · ${followup.employeeNames.join(", ")}`
                  : ""}
              </p>
            </div>

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">
                Closing note{" "}
                <span className="font-normal text-faint">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What action was taken?"
                className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                aria-label="Cancel closing follow-up"
                onClick={onClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                aria-label={`Confirm close ${followup.id}`}
                onClick={() => onConfirm(note)}
                disabled={pending}
              >
                {pending ? "Closing…" : "Mark closed"}
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
