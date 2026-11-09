import { isoDate, query, withTransaction } from "@/lib/db";
import { todayIso } from "@/lib/format";
import type {
  CreateMeetingInput,
  MeetingRecord,
  PulseScores,
} from "@/types";

type MeetingRow = {
  id: string;
  meeting_date: string;
  created_at: Date;
  meeting_type: MeetingRecord["meetingType"];
  channel: MeetingRecord["channel"];
  department: string;
  unit: string;
  team: string;
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  follow_up_note: string;
  pulse: PulseScores | null;
  pulse_note: string;
  ai_summary: string;
  employee_codes: string[] | null;
  employee_names: string[] | null;
};

function mapMeeting(row: MeetingRow): MeetingRecord {
  return {
    id: row.id,
    meetingDate: isoDate(row.meeting_date),
    createdAt: row.created_at.toISOString(),
    meetingType: row.meeting_type,
    channel: row.channel,
    department: row.department,
    unit: row.unit,
    team: row.team,
    positive: row.positive,
    risk: row.risk,
    negative: row.negative,
    recommendation: row.recommendation,
    followUpNote: row.follow_up_note,
    pulse: row.pulse,
    pulseNote: row.pulse_note,
    aiSummary: row.ai_summary,
    employeeCodes: row.employee_codes ?? [],
    employeeNames: row.employee_names ?? [],
  };
}

const MEETING_SELECT = `
  SELECT m.*,
    COALESCE(array_agg(DISTINCT me.employee_code) FILTER (WHERE me.employee_code IS NOT NULL), '{}') AS employee_codes,
    COALESCE(array_agg(DISTINCT e.name) FILTER (WHERE e.name IS NOT NULL), '{}') AS employee_names
  FROM employee_relations_meetings m
  LEFT JOIN employee_relations_meeting_employees me ON me.meeting_id = m.id
  LEFT JOIN employee_relations_employees e ON e.code = me.employee_code
`;

export async function listMeetings(search?: string): Promise<MeetingRecord[]> {
  const params: unknown[] = [];
  let having = "";
  if (search?.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    having = `HAVING lower(m.id) LIKE $1
      OR lower(m.department) LIKE $1
      OR lower(m.team) LIKE $1
      OR lower(string_agg(DISTINCT e.name, ' ')) LIKE $1`;
  }

  const result = await query<MeetingRow>(
    `${MEETING_SELECT}
     GROUP BY m.id
     ${having}
     ORDER BY m.meeting_date DESC, m.id DESC`,
    params,
  );
  return result.rows.map(mapMeeting);
}

export async function getMeeting(id: string): Promise<MeetingRecord | null> {
  const result = await query<MeetingRow>(
    `${MEETING_SELECT}
     WHERE m.id = $1
     GROUP BY m.id`,
    [id],
  );
  return result.rows[0] ? mapMeeting(result.rows[0]) : null;
}

export async function listMeetingsForEmployee(
  code: string,
): Promise<MeetingRecord[]> {
  const result = await query<MeetingRow>(
    `${MEETING_SELECT}
     WHERE EXISTS (
       SELECT 1 FROM employee_relations_meeting_employees x
       WHERE x.meeting_id = m.id AND x.employee_code = $1
     )
     GROUP BY m.id
     ORDER BY m.meeting_date ASC`,
    [code],
  );
  return result.rows.map(mapMeeting);
}

type TxClient = Parameters<Parameters<typeof withTransaction>[0]>[0];

async function nextId(
  client: TxClient,
  name: "meeting" | "followup",
  prefix: string,
): Promise<string> {
  const result = await client.query<{ value: number }>(
    `UPDATE employee_relations_id_sequences SET value = value + 1 WHERE name = $1 RETURNING value`,
    [name],
  );
  return `${prefix}-${String(result.rows[0].value).padStart(3, "0")}`;
}

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<MeetingRecord> {
  return withTransaction(async (client) => {
    const id = await nextId(client, "meeting", "MT");
    const first = await client.query<{
      department: string;
      unit: string;
      team: string;
    }>(`SELECT department, unit, team FROM employee_relations_employees WHERE code = $1`, [
      input.employeeCodes[0],
    ]);
    const dept = input.department || first.rows[0]?.department || "";
    const unit = input.unit || first.rows[0]?.unit || "";
    const team = input.team || first.rows[0]?.team || "";

    await client.query(
      `INSERT INTO employee_relations_meetings (
         id, meeting_date, meeting_type, channel, department, unit, team,
         positive, risk, negative, recommendation, follow_up_note,
         pulse, pulse_note, ai_summary, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id,
        input.meetingDate,
        input.meetingType,
        input.channel,
        dept,
        unit,
        team,
        input.positive,
        input.risk,
        input.negative,
        input.recommendation,
        input.followUpNote,
        input.pulse ? JSON.stringify(input.pulse) : null,
        input.pulseNote,
        input.aiSummary,
        input.createdBy,
      ],
    );

    for (const code of input.employeeCodes) {
      await client.query(
        `INSERT INTO employee_relations_meeting_employees (meeting_id, employee_code) VALUES ($1, $2)`,
        [id, code],
      );
    }

    for (const fu of input.followups.filter((f) => f.item.trim())) {
      const fuId = await nextId(client, "followup", "FU");
      await client.query(
        `INSERT INTO employee_relations_followups (id, meeting_id, item, target_date, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fuId, id, fu.item.trim(), fu.targetDate, input.createdBy, todayIso()],
      );
      for (const code of input.employeeCodes) {
        await client.query(
          `INSERT INTO employee_relations_followup_employees (followup_id, employee_code) VALUES ($1, $2)`,
          [fuId, code],
        );
      }
    }

    const result = await client.query<MeetingRow>(
      `${MEETING_SELECT} WHERE m.id = $1 GROUP BY m.id`,
      [id],
    );
    return mapMeeting(result.rows[0]);
  });
}
