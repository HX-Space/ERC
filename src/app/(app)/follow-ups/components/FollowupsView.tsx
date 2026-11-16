"use client";

import { useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";
import { motion } from "framer-motion";
import { closeFollowupAction } from "@/app/actions/followups";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { useLang, useT } from "@/components/i18n/lang";
import { isOverdue } from "@/lib/followups";
import { formatDate } from "@/lib/format";
import type { FollowupRecord } from "@/types";
import { CloseFollowupDialog } from "./CloseFollowupDialog";

type Filter = "Open" | "Overdue" | "Closed" | "All";

export function FollowupsView({
  followups,
  canClose,
  initialFilter = "Open",
}: {
  followups: FollowupRecord[];
  canClose: boolean;
  initialFilter?: Filter;
}) {
  const { toast } = useToast();
  const t = useT();
  const uiLang = useLang();
  const fmtDate = (iso: string | null | undefined) => formatDate(iso, uiLang);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [closing, setClosing] = useState<FollowupRecord | null>(null);
  const [pending, setPending] = useState(false);

  // Filter keys and status values stay as data; only the displayed text is translated.
  const filterLabels: Record<Filter, string> = {
    Open: t("Open", "مفتوحة"),
    Overdue: t("Overdue", "متأخرة"),
    Closed: t("Closed", "مغلقة"),
    All: t("All", "الكل"),
  };

  const counts = useMemo(
    () => ({
      Open: followups.filter((f) => f.status === "Open").length,
      Overdue: followups.filter((f) => isOverdue(f)).length,
      Closed: followups.filter((f) => f.status === "Closed").length,
      All: followups.length,
    }),
    [followups],
  );

  const list = useMemo(() => {
    let rows = [...followups];
    if (filter === "Open") rows = rows.filter((f) => f.status === "Open");
    if (filter === "Overdue") rows = rows.filter((f) => isOverdue(f));
    if (filter === "Closed") {
      rows = rows.filter((f) => f.status === "Closed").reverse();
    }
    return rows;
  }, [followups, filter]);

  async function confirmClose(note: string) {
    if (!closing) return;
    setPending(true);
    const result = await closeFollowupAction(closing.id, note);
    setPending(false);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    toast(t(`${closing.id} closed.`, `تم إغلاق ${closing.id}.`));
    setClosing(null);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("Follow-ups", "المتابعات")}</h1>
          <p>
            {t(
              "Closing records the action — not that the issue is resolved.",
              "الإغلاق يسجّل الإجراء المتخذ — لا يعني أن المشكلة قد حُلّت.",
            )}
          </p>
        </div>
      </header>

      <Panel>
        <PanelHeader
          title={
            <div className="inline-flex overflow-hidden rounded-[6px] border border-line-2">
              {(["Open", "Overdue", "Closed", "All"] as Filter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  aria-label={t(`Filter ${k}`, `تصفية: ${filterLabels[k]}`)}
                  className={`cursor-pointer px-3 py-1.5 text-sm outline-none ${
                    filter === k
                      ? "bg-active font-medium text-ink"
                      : "text-muted hover:bg-surface-2"
                  }`}
                  onClick={() => setFilter(k)}
                >
                  {filterLabels[k]}{" "}
                  <span className="mono text-xs opacity-80">{counts[k]}</span>
                </button>
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">{t("Item", "البند")}</th>
                <th className="px-3 py-2">{t("Employee(s)", "الموظف/الموظفون")}</th>
                <th className="px-3 py-2">{t("Target", "الموعد المستهدف")}</th>
                <th className="px-3 py-2">{t("Status", "الحالة")}</th>
                <th className="px-3 py-2">{t("Closing note", "ملاحظة الإغلاق")}</th>
                {canClose ? (
                  <th className="w-14 px-3 py-2 text-center">{t("Close", "إغلاق")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-line last:border-0 align-middle"
                  >
                    <td className="px-3 py-3">
                      <div>{f.item}</div>
                      <div className="mt-1 text-xs text-faint">
                        <span className="mono text-ai">{f.meetingId}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {(f.employeeNames ?? []).join(", ")}
                    </td>
                    <td className="mono px-3 py-3">
                      {fmtDate(f.targetDate)}
                      {f.closedAt ? (
                        <div className="text-xs text-faint">
                          {t(
                            `closed ${fmtDate(f.closedAt)}`,
                            `أُغلقت ${fmtDate(f.closedAt)}`,
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Pill
                        tone={
                          f.status === "Closed"
                            ? "ok"
                            : isOverdue(f)
                              ? "risk"
                              : "info"
                        }
                      >
                        {f.status === "Closed"
                          ? filterLabels.Closed
                          : isOverdue(f)
                            ? filterLabels.Overdue
                            : filterLabels.Open}
                      </Pill>
                    </td>
                    <td className="max-w-[22rem] px-3 py-3 text-sm" dir="auto">
                      {f.note ? f.note : <span className="text-faint">—</span>}
                    </td>
                    {canClose ? (
                      <td className="px-3 py-3 text-center">
                        {f.status === "Open" ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            aria-label={t(`Mark ${f.id} closed`, `تحديد ${f.id} كمغلقة`)}
                            title={t("Mark closed", "تحديد كمغلقة")}
                            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line-2 bg-surface text-ink outline-none transition hover:border-ok/40 hover:bg-ok-soft hover:text-ok"
                            onClick={() => setClosing(f)}
                          >
                            <CircleCheck className="size-5" strokeWidth={1.75} />
                          </motion.button>
                        ) : (
                          <span
                            className="inline-flex size-9 items-center justify-center text-ok/50"
                            title={t("Already closed", "مغلقة بالفعل")}
                            aria-label={t("Already closed", "مغلقة بالفعل")}
                          >
                            <CircleCheck className="size-4" strokeWidth={1.75} />
                          </span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={canClose ? 6 : 5}
                    className="px-3 py-10 text-center text-muted"
                  >
                    {t("No follow-ups in this view.", "لا توجد متابعات في هذا العرض.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <CloseFollowupDialog
        followup={closing}
        open={Boolean(closing)}
        pending={pending}
        onClose={() => setClosing(null)}
        onConfirm={confirmClose}
      />
    </>
  );
}
