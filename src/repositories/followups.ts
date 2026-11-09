import { isoDate, query } from "@/lib/db";
import { todayIso } from "@/lib/format";
import type { FollowupRecord } from "@/types";

type FollowupRow = {
  id: string;
  meeting_id: string;
  item: string;
  target_date: string;
  status: "Open" | "Closed";
  note: string;
  created_at: string;
  closed_at: string | null;
  employee_codes: string[] | null;
  employee_names: string[] | null;
};

function mapFollowup(row: FollowupRow): FollowupRecord {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    item: row.item,
    targetDate: isoDate(row.target_date),
    status: row.status,
    note: row.note,
    createdAt: isoDate(row.created_at),
    closedAt: row.closed_at ? isoDate(row.closed_at) : null,
    employeeCodes: row.employee_codes ?? [],
    employeeNames: row.employee_names ?? [],
  };
}

const SELECT = `
  SELECT f.*,
    COALESCE(array_agg(DISTINCT fe.employee_code) FILTER (WHERE fe.employee_code IS NOT NULL), '{}') AS employee_codes,
    COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), '{}') AS employee_names
  FROM employee_relations_followups f
  LEFT JOIN employee_relations_followup_employees fe ON fe.followup_id = f.id
  LEFT JOIN employee_relations_employees e ON e.code = fe.employee_code
`;

export async function listFollowups(): Promise<FollowupRecord[]> {
  const result = await query<FollowupRow>(
    `${SELECT}
     GROUP BY f.id
     ORDER BY f.target_date ASC, f.id ASC`,
  );
  return result.rows.map(mapFollowup);
}

export async function listFollowupsForEmployee(
  code: string,
): Promise<FollowupRecord[]> {
  const result = await query<FollowupRow>(
    `${SELECT}
     WHERE EXISTS (
       SELECT 1 FROM employee_relations_followup_employees x
       WHERE x.followup_id = f.id AND x.employee_code = $1
     )
     GROUP BY f.id
     ORDER BY f.target_date DESC`,
    [code],
  );
  return result.rows.map(mapFollowup);
}

export async function listFollowupsForMeeting(
  meetingId: string,
): Promise<FollowupRecord[]> {
  const result = await query<FollowupRow>(
    `${SELECT}
     WHERE f.meeting_id = $1
     GROUP BY f.id
     ORDER BY f.target_date ASC`,
    [meetingId],
  );
  return result.rows.map(mapFollowup);
}

export async function closeFollowup(
  id: string,
  note: string,
): Promise<FollowupRecord> {
  await query(
    `UPDATE employee_relations_followups
     SET status = 'Closed', note = $2, closed_at = $3
     WHERE id = $1`,
    [id, note, todayIso()],
  );
  const result = await query<FollowupRow>(
    `${SELECT} WHERE f.id = $1 GROUP BY f.id`,
    [id],
  );
  return mapFollowup(result.rows[0]);
}

