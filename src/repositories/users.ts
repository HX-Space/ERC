import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import type { UserRecord, UserRole } from "@/types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  manager_code: string | null;
  is_active: boolean;
  created_at: Date;
};

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    managerCode: row.manager_code,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listUsers(): Promise<UserRecord[]> {
  const result = await query<UserRow>(
    `SELECT id, email, name, role, manager_code, is_active, created_at
     FROM employee_relations_users ORDER BY created_at ASC`,
  );
  return result.rows.map(mapUser);
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  managerCode?: string | null;
}): Promise<UserRecord> {
  const hash = await bcrypt.hash(input.password, 10);
  const result = await query<UserRow>(
    `INSERT INTO employee_relations_users (email, name, password_hash, role, manager_code)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, manager_code, is_active, created_at`,
    [
      input.email.toLowerCase(),
      input.name,
      hash,
      input.role,
      input.managerCode ?? null,
    ],
  );
  return mapUser(result.rows[0]);
}

export async function updateUserRole(
  id: string,
  role: UserRole,
  managerCode: string | null,
): Promise<UserRecord> {
  const result = await query<UserRow>(
    `UPDATE employee_relations_users
     SET role = $2, manager_code = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, name, role, manager_code, is_active, created_at`,
    [id, role, managerCode],
  );
  return mapUser(result.rows[0]);
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<UserRecord> {
  const result = await query<UserRow>(
    `UPDATE employee_relations_users SET is_active = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, name, role, manager_code, is_active, created_at`,
    [id, isActive],
  );
  return mapUser(result.rows[0]);
}

/** Replaces the password. Returns false when no user has this id. */
export async function setUserPassword(id: string, password: string): Promise<boolean> {
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    `UPDATE employee_relations_users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [id, hash],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function countUsers(): Promise<number> {
  const result = await query<{ n: string }>(`SELECT count(*)::text AS n FROM employee_relations_users`);
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Creates the first admin only while the users table is empty. The insert and
 * the emptiness check are one statement, so two people racing through /setup
 * cannot both become admin.
 */
export async function createFirstAdmin(input: {
  email: string;
  name: string;
  password: string;
}): Promise<boolean> {
  const hash = await bcrypt.hash(input.password, 10);
  const result = await query(
    `INSERT INTO employee_relations_users (email, name, password_hash, role)
     SELECT $1, $2, $3, 'ADMIN'
     WHERE NOT EXISTS (SELECT 1 FROM employee_relations_users)`,
    [input.email.toLowerCase(), input.name, hash],
  );
  return (result.rowCount ?? 0) === 1;
}
