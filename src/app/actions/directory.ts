"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { canManageUsers } from "@/lib/rbac";
import {
  importDirectory,
  setEmployeeStatus,
  upsertEmployee,
  upsertManager,
  type DirectoryRow,
} from "@/repositories/employees";
import type { ManagerRecord } from "@/types";

type Result = { ok: true; message: string } | { ok: false; error: string };

const text = (label: string) => z.string().trim().min(1, `${label} is required.`);
const code = (label: string) =>
  text(label).regex(/^[A-Za-z0-9_-]{1,20}$/, `${label}: letters, numbers, - or _ only.`);

const managerSchema = z.object({
  code: code("Manager code"),
  name: text("Manager name"),
  title: text("Manager title"),
});

const employeeSchema = z.object({
  code: code("Employee code"),
  name: text("Name"),
  title: text("Job title"),
  department: text("Department"),
  unit: text("Unit"),
  team: text("Team"),
  managerCode: code("Manager code"),
  status: z.enum(["Active", "Inactive"]),
});

async function requireAdmin(): Promise<string | null> {
  const t = await getT();
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return t("Admin access required.", "تتطلب صلاحية المسؤول.");
  }
  return null;
}

function refresh() {
  for (const p of ["/directory", "/meetings", "/employees", "/feedback", "/admin", "/dashboard", "/analytics"]) {
    revalidatePath(p);
  }
}

function dbError(error: unknown, t: T): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/employees_manager_code_fkey|foreign key/i.test(msg)) {
    return t(
      "That manager code does not exist. Add the manager first.",
      "رمز المدير غير موجود. أضف المدير أولاً.",
    );
  }
  return msg;
}

export async function saveManagerAction(input: ManagerRecord): Promise<Result> {
  const t = await getT();
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const parsed = managerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await upsertManager({ ...parsed.data, code: parsed.data.code.toUpperCase() });
  refresh();
  return {
    ok: true,
    message: t(`Manager ${parsed.data.name} saved.`, `تم حفظ المدير ${parsed.data.name}.`),
  };
}

export async function saveEmployeeAction(input: DirectoryRow): Promise<Result> {
  const t = await getT();
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await upsertEmployee({
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
      managerCode: parsed.data.managerCode.toUpperCase(),
    });
  } catch (error) {
    return { ok: false, error: dbError(error, t) };
  }
  refresh();
  return { ok: true, message: t(`${parsed.data.name} saved.`, `تم حفظ ${parsed.data.name}.`) };
}

export async function setEmployeeStatusAction(
  employeeCode: string,
  status: "Active" | "Inactive",
): Promise<Result> {
  const t = await getT();
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };
  await setEmployeeStatus(employeeCode, status);
  refresh();
  const statusLabel = status === "Active" ? t("Active", "نشط") : t("Inactive", "غير نشط");
  return {
    ok: true,
    message: t(`Status set to ${statusLabel}.`, `تم تعيين الحالة إلى ${statusLabel}.`),
  };
}

/* ---------- CSV import ---------- */

const DIRECTORY_COLUMNS = [
  "code",
  "name",
  "title",
  "department",
  "unit",
  "team",
  "manager_code",
  "manager_name",
  "manager_title",
  "status",
] as const;

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^﻿/, "");
  const delimiter = text.split("\n")[0].includes("\t") && !text.split("\n")[0].includes(",") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

export async function importDirectoryAction(csv: string): Promise<Result> {
  const t = await getT();
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return {
      ok: false,
      error: t("Paste a header row and at least one employee.", "الصق صف العناوين وموظفاً واحداً على الأقل."),
    };
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/[\s-]+/g, "_"));
  const missing = DIRECTORY_COLUMNS.filter((c) => c !== "status" && !header.includes(c));
  if (missing.length) {
    const many = missing.length > 1;
    const list = missing.join(", ");
    return {
      ok: false,
      error: t(
        `Missing column${many ? "s" : ""}: ${list}.`,
        `${many ? "الأعمدة المفقودة" : "العمود المفقود"}: ${list}.`,
      ),
    };
  }
  const col = (r: string[], name: string) => r[header.indexOf(name)] ?? "";

  const managers = new Map<string, ManagerRecord>();
  const employees: DirectoryRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const status = col(r, "status") || "Active";
    const m = managerSchema.safeParse({
      code: col(r, "manager_code"),
      name: col(r, "manager_name"),
      title: col(r, "manager_title"),
    });
    if (!m.success) return { ok: false, error: `Line ${line}: ${m.error.issues[0].message}` };
    const e = employeeSchema.safeParse({
      code: col(r, "code"),
      name: col(r, "name"),
      title: col(r, "title"),
      department: col(r, "department"),
      unit: col(r, "unit"),
      team: col(r, "team"),
      managerCode: col(r, "manager_code"),
      status: status[0].toUpperCase() + status.slice(1).toLowerCase(),
    });
    if (!e.success) return { ok: false, error: `Line ${line}: ${e.error.issues[0].message}` };

    const empCode = e.data.code.toUpperCase();
    if (seen.has(empCode)) {
      return {
        ok: false,
        error: t(
          `Line ${line}: employee code ${empCode} appears twice.`,
          `السطر ${line}: رمز الموظف ${empCode} مكرر.`,
        ),
      };
    }
    seen.add(empCode);

    const mgrCode = m.data.code.toUpperCase();
    managers.set(mgrCode, { ...m.data, code: mgrCode });
    employees.push({ ...e.data, code: empCode, managerCode: mgrCode });
  }

  try {
    const result = await importDirectory([...managers.values()], employees);
    refresh();
    return {
      ok: true,
      message: t(
        `Imported ${result.employees} employee${result.employees === 1 ? "" : "s"} (${result.created} new) and ${result.managers} manager${result.managers === 1 ? "" : "s"}.`,
        `تم استيراد ${result.employees} موظف (${result.created} جديد) و${result.managers} مدير.`,
      ),
    };
  } catch (error) {
    return { ok: false, error: dbError(error, t) };
  }
}
