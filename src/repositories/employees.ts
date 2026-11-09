import { query, withTransaction } from "@/lib/db";
import type { EmployeeRecord, ManagerRecord } from "@/types";

type EmployeeRow = {
  code: string;
  name: string;
  title: string;
  department: string;
  unit: string;
  team: string;
  manager_code: string;
  manager_name: string | null;
  status: "Active" | "Inactive";
};

function mapEmployee(row: EmployeeRow): EmployeeRecord {
  return {
    code: row.code,
    name: row.name,
    title: row.title,
    department: row.department,
    unit: row.unit,
    team: row.team,
    managerCode: row.manager_code,
    managerName: row.manager_name ?? undefined,
    status: row.status,
  };
}

export async function listManagers(): Promise<ManagerRecord[]> {
  const result = await query<{ code: string; name: string; title: string }>(
    `SELECT code, name, title FROM employee_relations_managers ORDER BY name`,
  );
  return result.rows;
}

export async function listEmployees(filters?: {
  department?: string;
  title?: string;
  q?: string;
  managerCode?: string;
  status?: "Active" | "Inactive";
}): Promise<EmployeeRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.department) {
    params.push(filters.department);
    clauses.push(`e.department = $${params.length}`);
  }
  if (filters?.title) {
    params.push(filters.title);
    clauses.push(`e.title = $${params.length}`);
  }
  if (filters?.managerCode) {
    params.push(filters.managerCode);
    clauses.push(`e.manager_code = $${params.length}`);
  }
  if (filters?.status) {
    params.push(filters.status);
    clauses.push(`e.status = $${params.length}`);
  }
  if (filters?.q?.trim()) {
    params.push(`%${filters.q.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(e.name) LIKE $${params.length} OR lower(e.code) LIKE $${params.length})`,
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query<EmployeeRow>(
    `SELECT e.code, e.name, e.title, e.department, e.unit, e.team,
            e.manager_code, m.name AS manager_name, e.status
     FROM employee_relations_employees e
     JOIN employee_relations_managers m ON m.code = e.manager_code
     ${where}
     ORDER BY e.department, e.name`,
    params,
  );
  return result.rows.map(mapEmployee);
}

export async function getEmployee(
  code: string,
): Promise<EmployeeRecord | null> {
  const result = await query<EmployeeRow>(
    `SELECT e.code, e.name, e.title, e.department, e.unit, e.team,
            e.manager_code, m.name AS manager_name, e.status
     FROM employee_relations_employees e
     JOIN employee_relations_managers m ON m.code = e.manager_code
     WHERE e.code = $1`,
    [code],
  );
  return result.rows[0] ? mapEmployee(result.rows[0]) : null;
}

export async function listDepartments(): Promise<string[]> {
  const result = await query<{ department: string }>(
    `SELECT DISTINCT department FROM employee_relations_employees ORDER BY department`,
  );
  return result.rows.map((r) => r.department);
}

export async function listTitles(department?: string): Promise<string[]> {
  if (department) {
    const result = await query<{ title: string }>(
      `SELECT DISTINCT title FROM employee_relations_employees WHERE department = $1 ORDER BY title`,
      [department],
    );
    return result.rows.map((r) => r.title);
  }
  const result = await query<{ title: string }>(
    `SELECT DISTINCT title FROM employee_relations_employees ORDER BY title`,
  );
  return result.rows.map((r) => r.title);
}

/* ---------- Writes (admin) ---------- */

export interface DirectoryRow {
  code: string;
  name: string;
  title: string;
  department: string;
  unit: string;
  team: string;
  managerCode: string;
  status: "Active" | "Inactive";
}

export async function upsertManager(input: ManagerRecord): Promise<void> {
  await query(
    `INSERT INTO employee_relations_managers (code, name, title) VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title`,
    [input.code, input.name, input.title],
  );
}

export async function upsertEmployee(input: DirectoryRow): Promise<void> {
  await query(
    `INSERT INTO employee_relations_employees (code, name, title, department, unit, team, manager_code, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name, title = EXCLUDED.title, department = EXCLUDED.department,
       unit = EXCLUDED.unit, team = EXCLUDED.team, manager_code = EXCLUDED.manager_code,
       status = EXCLUDED.status`,
    [
      input.code,
      input.name,
      input.title,
      input.department,
      input.unit,
      input.team,
      input.managerCode,
      input.status,
    ],
  );
}

/** Imports managers then employees in one transaction: all rows or none. */
export async function importDirectory(
  managers: ManagerRecord[],
  employees: DirectoryRow[],
): Promise<{ managers: number; employees: number; created: number }> {
  return withTransaction(async (client) => {
    for (const m of managers) {
      await client.query(
        `INSERT INTO employee_relations_managers (code, name, title) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title`,
        [m.code, m.name, m.title],
      );
    }
    let created = 0;
    for (const e of employees) {
      const r = await client.query<{ inserted: boolean }>(
        `INSERT INTO employee_relations_employees (code, name, title, department, unit, team, manager_code, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name, title = EXCLUDED.title, department = EXCLUDED.department,
           unit = EXCLUDED.unit, team = EXCLUDED.team, manager_code = EXCLUDED.manager_code,
           status = EXCLUDED.status
         RETURNING (xmax = 0) AS inserted`,
        [e.code, e.name, e.title, e.department, e.unit, e.team, e.managerCode, e.status],
      );
      if (r.rows[0]?.inserted) created++;
    }
    return { managers: managers.length, employees: employees.length, created };
  });
}

export async function setEmployeeStatus(
  code: string,
  status: "Active" | "Inactive",
): Promise<void> {
  await query(`UPDATE employee_relations_employees SET status = $2 WHERE code = $1`, [code, status]);
}
