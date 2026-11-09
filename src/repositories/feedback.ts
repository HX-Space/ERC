import { isoDate, query } from "@/lib/db";
import { todayIso } from "@/lib/format";
import type {
  FeedbackAiSummary,
  FeedbackMode,
  FeedbackStatus,
  ManagerFeedbackRecord,
} from "@/types";

type FeedbackRow = {
  id: string;
  employee_code: string;
  manager_code: string;
  cycle: string;
  mode: FeedbackMode;
  body: string;
  language: string | null;
  has_audio: boolean;
  status: FeedbackStatus;
  ai_summary: FeedbackAiSummary | null;
  feedback_date: string;
  employee_name: string | null;
  employee_title: string | null;
};

function mapFeedback(row: FeedbackRow): ManagerFeedbackRecord {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    managerCode: row.manager_code,
    cycle: row.cycle,
    mode: row.mode,
    body: row.body,
    language: row.language,
    hasAudio: row.has_audio,
    status: row.status,
    aiSummary: row.ai_summary,
    feedbackDate: isoDate(row.feedback_date),
    employeeName: row.employee_name ?? undefined,
    employeeTitle: row.employee_title ?? undefined,
  };
}

export async function listFeedbackForManager(
  managerCode: string,
  cycle: string,
): Promise<ManagerFeedbackRecord[]> {
  const result = await query<FeedbackRow>(
    `SELECT f.*, e.name AS employee_name, e.title AS employee_title
     FROM employee_relations_manager_feedback f
     JOIN employee_relations_employees e ON e.code = f.employee_code
     WHERE f.manager_code = $1 AND f.cycle = $2
     ORDER BY e.name`,
    [managerCode, cycle],
  );
  return result.rows.map(mapFeedback);
}

export async function listFeedbackForEmployee(
  code: string,
): Promise<ManagerFeedbackRecord[]> {
  const result = await query<FeedbackRow>(
    `SELECT f.*, e.name AS employee_name, e.title AS employee_title
     FROM employee_relations_manager_feedback f
     JOIN employee_relations_employees e ON e.code = f.employee_code
     WHERE f.employee_code = $1 AND f.status = 'Submitted'
     ORDER BY f.feedback_date DESC`,
    [code],
  );
  return result.rows.map(mapFeedback);
}

export async function getLatestFeedback(
  employeeCode: string,
  managerCode: string,
  cycle: string,
): Promise<ManagerFeedbackRecord | null> {
  const result = await query<FeedbackRow>(
    `SELECT f.*, e.name AS employee_name, e.title AS employee_title
     FROM employee_relations_manager_feedback f
     JOIN employee_relations_employees e ON e.code = f.employee_code
     WHERE f.employee_code = $1 AND f.manager_code = $2 AND f.cycle = $3
     ORDER BY f.updated_at DESC
     LIMIT 1`,
    [employeeCode, managerCode, cycle],
  );
  return result.rows[0] ? mapFeedback(result.rows[0]) : null;
}

async function nextFeedbackId(): Promise<string> {
  const result = await query<{ value: number }>(
    `UPDATE employee_relations_id_sequences SET value = value + 1 WHERE name = 'feedback' RETURNING value`,
  );
  return `FB-${String(result.rows[0].value).padStart(3, "0")}`;
}

export async function upsertFeedback(input: {
  employeeCode: string;
  managerCode: string;
  cycle: string;
  mode: FeedbackMode;
  body: string;
  language: string | null;
  hasAudio: boolean;
  status: FeedbackStatus;
  aiSummary: FeedbackAiSummary | null;
  existingId?: string;
}): Promise<ManagerFeedbackRecord> {
  if (input.existingId) {
    await query(
      `UPDATE employee_relations_manager_feedback
       SET mode = $2, body = $3, language = $4, has_audio = $5,
           status = $6, ai_summary = $7, feedback_date = $8,
           updated_at = NOW()
       WHERE id = $1`,
      [
        input.existingId,
        input.mode,
        input.body,
        input.language,
        input.hasAudio,
        input.status,
        input.aiSummary ? JSON.stringify(input.aiSummary) : null,
        todayIso(),
      ],
    );
    const existing = await getLatestFeedback(
      input.employeeCode,
      input.managerCode,
      input.cycle,
    );
    return existing!;
  }

  const id = await nextFeedbackId();
  await query(
    `INSERT INTO employee_relations_manager_feedback (
       id, employee_code, manager_code, cycle, mode, body, language,
       has_audio, status, ai_summary, feedback_date
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id,
      input.employeeCode,
      input.managerCode,
      input.cycle,
      input.mode,
      input.body,
      input.language,
      input.hasAudio,
      input.status,
      input.aiSummary ? JSON.stringify(input.aiSummary) : null,
      todayIso(),
    ],
  );
  const created = await getLatestFeedback(
    input.employeeCode,
    input.managerCode,
    input.cycle,
  );
  return created!;
}
