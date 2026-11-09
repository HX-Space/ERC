import { existsSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient } from "pg";

if (!process.env.DATABASE_URL) {
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Seed runs against local Postgres only.");
}
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(connectionString).hostname)) {
  throw new Error("Seed runs against the local Docker database only (localhost).");
}

const pool = new Pool({ connectionString });

const PASSWORD = "Password123!";

const MANAGERS = [
  { code: "M01", name: "Karim Fawzy", title: "Customer Care Manager" },
  { code: "M02", name: "Heba Mansour", title: "Logistics Lead" },
  { code: "M03", name: "Tarek Hassan", title: "Sales Manager" },
  { code: "M04", name: "Rania Samir", title: "Finance Manager" },
  { code: "M05", name: "Omar Nabil", title: "Head of Technology" },
];

const TEAMS: Record<string, { department: string; unit: string; manager: string; titles: string[] }> = {
  Inbound: { department: "Operations", unit: "Customer Care", manager: "M01", titles: ["Customer Care Agent", "Senior Customer Care Agent"] },
  Escalations: { department: "Operations", unit: "Customer Care", manager: "M01", titles: ["Escalations Specialist"] },
  Quality: { department: "Operations", unit: "Customer Care", manager: "M01", titles: ["Quality Analyst"] },
  Dispatch: { department: "Operations", unit: "Logistics", manager: "M02", titles: ["Dispatcher", "Senior Dispatcher"] },
  Warehouse: { department: "Operations", unit: "Logistics", manager: "M02", titles: ["Warehouse Associate", "Warehouse Supervisor"] },
  "Key Accounts": { department: "Sales", unit: "Corporate Sales", manager: "M03", titles: ["Account Manager", "Senior Account Manager"] },
  Field: { department: "Sales", unit: "Retail Sales", manager: "M03", titles: ["Sales Representative"] },
  "Inside Sales": { department: "Sales", unit: "Retail Sales", manager: "M03", titles: ["Inside Sales Executive"] },
  Payables: { department: "Finance", unit: "Accounting", manager: "M04", titles: ["Accountant", "Senior Accountant"] },
  Payroll: { department: "Finance", unit: "Accounting", manager: "M04", titles: ["Payroll Specialist"] },
  Platform: { department: "Technology", unit: "Engineering", manager: "M05", titles: ["Software Engineer", "Senior Software Engineer"] },
  Support: { department: "Technology", unit: "Engineering", manager: "M05", titles: ["Support Engineer"] },
};

// [name, team, title index, status]
const CORE: [string, string, number, ("Active" | "Inactive")?][] = [
  ["Ahmed Saeed", "Inbound", 0],
  ["Nour El-Din Ali", "Inbound", 1],
  ["Salma Ibrahim", "Inbound", 0],
  ["Youssef Gamal", "Inbound", 0],
  ["Mariam Hosny", "Escalations", 0],
  ["Mahmoud Reda", "Escalations", 0],
  ["Mostafa Kamel", "Dispatch", 1],
  ["Aya Farouk", "Dispatch", 0],
  ["Hany Lotfy", "Dispatch", 0],
  ["Sherif Adel", "Warehouse", 1],
  ["Dina Magdy", "Warehouse", 0],
  ["Laila Mostafa", "Key Accounts", 1],
  ["Amr Khaled", "Key Accounts", 0],
  ["Rana Essam", "Key Accounts", 0],
  ["Islam Fathy", "Field", 0],
  ["Nada Hamdy", "Field", 0],
  ["Khaled Zaki", "Field", 0, "Inactive"],
  ["Mai Abdelrahman", "Payables", 1],
  ["Hossam Wagdy", "Payables", 0],
  ["Yasmin Sobhy", "Payroll", 0],
  ["Ali Nasser", "Platform", 1],
  ["Farida Selim", "Platform", 0],
  ["Bassem Tawfik", "Platform", 0],
  ["Ola Ragab", "Support", 0],
];

const EXTRA: [string, string, number][] = [
  ["Menna Shawky", "Inbound", 0],
  ["Karim Abdelaziz", "Inbound", 0],
  ["Hagar Mahmoud", "Quality", 0],
  ["Tamer Fouad", "Quality", 0],
  ["Ehab Soliman", "Escalations", 0],
  ["Shimaa Rashad", "Dispatch", 0],
  ["Waleed Hegazy", "Warehouse", 0],
  ["Ashraf Ramadan", "Warehouse", 0],
  ["Reem Galal", "Key Accounts", 0],
  ["Mohamed Tolba", "Field", 0],
  ["Ayman Sabry", "Field", 0],
  ["Habiba Osman", "Inside Sales", 0],
  ["Ziad El-Sherbiny", "Inside Sales", 0],
  ["Marwa Anwar", "Payables", 0],
  ["Sameh Barakat", "Payroll", 0],
  ["Nermeen Zaher", "Payroll", 0],
  ["Ramy Helmy", "Platform", 0],
  ["Yara Mekky", "Platform", 1],
  ["Hazem Darwish", "Support", 0],
  ["Doaa Shehata", "Support", 0],
];

const USERS = [
  { email: "admin@relations.local", name: "System Admin", role: "ADMIN", managerCode: null },
  { email: "fatma@relations.local", name: "Fatma Hassan", role: "ER", managerCode: null },
  { email: "hr@relations.local", name: "Nadine Farouk", role: "HR", managerCode: null },
  { email: "karim@relations.local", name: "Karim Fawzy", role: "MANAGER", managerCode: "M01" },
  { email: "heba@relations.local", name: "Heba Mansour", role: "MANAGER", managerCode: "M02" },
];

function pulse(c: number, a: number, d: number, i: number, l: number, s: number) {
  return { c, a, d, i, l, s };
}

const MEETINGS = [
  {
    date: "2026-08-12", type: "Group", channel: "Phone",
    employees: ["Mostafa Kamel", "Aya Farouk", "Hany Lotfy"],
    positive: "Aya's new pickup checklist reduced missed pickups.",
    risk: "Workload remains high at month end. Hany is worried about taking an extra route.",
    negative: "Dispatch tablets still freeze during peak hours.",
    recommendation: "Re-escalate the tablet issue. Review route distribution with Heba.",
    followUpNote: "Re-escalate tablets.", pulse: null, pulseNote: "",
  },
  {
    date: "2026-09-02", type: "Individual", channel: "Face-to-Face",
    employees: ["Ahmed Saeed"],
    positive: "Started shadowing in Escalations and handles complex cases well.",
    risk: "", negative: "",
    recommendation: "Confirm the Escalations transfer date with Karim.",
    followUpNote: "Confirm transfer date.", pulse: pulse(4, 5, 5, 4, 4, 4), pulseNote: "",
  },
  {
    date: "2026-09-09", type: "Individual", channel: "Face-to-Face",
    employees: ["Ali Nasser"],
    positive: "Led the payment service migration. Mentors Bassem on code reviews.",
    risk: "", negative: "On-call load is uneven again.",
    recommendation: "Formalise a tech lead trial for Q4.",
    followUpNote: "Confirm Q4 tech lead trial.", pulse: pulse(5, 5, 5, 5, 5, 4), pulseNote: "",
  },
  {
    date: "2026-09-23", type: "Individual", channel: "Online",
    employees: ["Mostafa Kamel"],
    positive: "Appreciated the route change.",
    risk: "Still feels overtime pay delays are unfair. Workload is better but not solved.",
    negative: "",
    recommendation: "Check in monthly until payroll timing is stable.",
    followUpNote: "Check in after October payroll.", pulse: pulse(3, 3, 2, 3, 3, 3),
    pulseNote: "Visibly tired. Satisfaction dropped since the last conversation.",
  },
  {
    date: "2026-10-07", type: "Group", channel: "Face-to-Face",
    employees: ["Mai Abdelrahman", "Hossam Wagdy"],
    positive: "Month-end close finished two days earlier.",
    risk: "Manual invoice entry creates errors under pressure.",
    negative: "Unclear approval limits slow down payments.",
    recommendation: "Document approval limits. Explore invoice automation.",
    followUpNote: "Approval limits document.", pulse: null, pulseNote: "",
  },
  {
    date: "2026-10-14", type: "Individual", channel: "Face-to-Face",
    employees: ["Mariam Hosny"],
    positive: "Ownership rules are now clear and the conflict with the team is resolved.",
    risk: "", negative: "", recommendation: "", followUpNote: "",
    pulse: pulse(4, 4, 4, 3, 3, 3),
    pulseNote: "Quiet in the meeting, though her examples were clear.",
  },
  {
    date: "2026-10-21", type: "Individual", channel: "Phone",
    employees: ["Laila Mostafa"],
    positive: "Exceeded the Q3 target. Supports Rana on proposals.",
    risk: "Commission payout is delayed.", negative: "",
    recommendation: "Ask Finance to confirm the payout date.",
    followUpNote: "Confirm commission payout date.", pulse: pulse(5, 5, 4, 4, 5, 5), pulseNote: "",
  },
  {
    date: "2026-10-28", type: "Group", channel: "Online",
    employees: ["Salma Ibrahim", "Youssef Gamal", "Nour El-Din Ali"],
    positive: "Team handles billing calls independently. Nour coaches new joiners well.",
    risk: "Shift swaps are being approved late, causing frustration.",
    negative: "Headsets keep breaking and replacements take weeks.",
    recommendation: "Agree a shift-swap approval SLA with Karim. Request headset stock from IT.",
    followUpNote: "Shift-swap SLA and headset stock.", pulse: null, pulseNote: "",
  },
];

// [meeting index (1-based), item, target date, status, note]
const FOLLOWUPS: [number, string, string, "Open" | "Closed", string][] = [
  [1, "Re-escalate tablet freezing issue to Technology", "2026-09-01", "Closed", "IT replaced firmware on 6 tablets."],
  [1, "Review route distribution with Heba Mansour", "2026-10-30", "Open", ""],
  [2, "Confirm the Escalations transfer date with Karim", "2026-09-20", "Closed", "Transfer confirmed for January."],
  [3, "Confirm Q4 tech lead trial with Omar", "2026-11-15", "Open", ""],
  [4, "Check in with Mostafa after October payroll", "2026-10-31", "Open", ""],
  [5, "Document approval limits with Rania", "2026-11-25", "Open", ""],
  [7, "Confirm commission payout date with Finance", "2026-11-10", "Open", ""],
  [8, "Agree shift-swap approval SLA with Karim", "2026-11-18", "Open", ""],
  [8, "Request headset replacement stock from IT", "2026-11-04", "Closed", "20 headsets delivered."],
];

const CYCLE = "Year-end 2026";

const FEEDBACK = [
  {
    employee: "Ahmed Saeed", manager: "M01", date: "2026-10-20",
    body: "Ahmed is one of the most dependable agents on the Inbound team. Customers regularly mention him by name. He sometimes takes too long on simple calls because he wants every detail right. He is ready for a move to Escalations and I recommend we plan it for Q1.",
    ai: {
      strengths: ["Highly dependable", "Customers mention him by name"],
      development: ["Spends too long on simple calls"],
      concerns: [],
      recommendations: ["Plan move to Escalations in Q1"],
    },
  },
  {
    employee: "Mariam Hosny", manager: "M01", date: "2026-10-22",
    body: "Mariam is calm and patient with angry customers. She is quiet in team meetings and rarely shares ideas in front of others. There was a disagreement about case ownership in the summer, now resolved. She would benefit from a short presentation skills course.",
    ai: {
      strengths: ["Calm and patient with angry customers"],
      development: ["Rarely shares ideas in team meetings"],
      concerns: ["Past case-ownership disagreement (resolved)"],
      recommendations: ["Short presentation skills course"],
    },
  },
  {
    employee: "Mostafa Kamel", manager: "M02", date: "2026-10-18",
    body: "Mostafa is one of the strongest dispatchers and knows every route well. He helps new drivers without being asked. Lately he is under heavy pressure and working a lot of overtime. I am worried he may leave if this continues. We need to reduce his load and consider a formal driver-training role for him.",
    ai: {
      strengths: ["Excellent route knowledge", "Helps new drivers proactively"],
      development: [],
      concerns: ["Heavy overtime and pressure", "Flight risk if workload persists"],
      recommendations: ["Reduce workload", "Consider a formal driver-training role"],
    },
  },
  {
    employee: "Aya Farouk", manager: "M02", date: "2026-10-26",
    body: "Aya designed the pickup checklist that cut missed pickups noticeably. She is organised and follows through. She hesitates to push back on drivers when they skip steps. Recommend giving her ownership of the checklist rollout to Warehouse.",
    ai: null,
  },
];

async function seed(client: PoolClient) {
  await client.query(`
    TRUNCATE employee_relations_followup_employees, employee_relations_followups,
             employee_relations_meeting_employees, employee_relations_meetings,
             employee_relations_manager_feedback, employee_relations_employees,
             employee_relations_managers, employee_relations_users CASCADE
  `);

  for (const m of MANAGERS) {
    await client.query(`INSERT INTO employee_relations_managers (code, name, title) VALUES ($1, $2, $3)`, [m.code, m.name, m.title]);
  }

  const codeByName = new Map<string, string>();
  const employees = [
    ...CORE.map(([name, team, ti, status]) => ({ name, team, ti, status: status ?? "Active" })),
    ...EXTRA.map(([name, team, ti]) => ({ name, team, ti, status: "Active" })),
  ];
  for (const [i, e] of employees.entries()) {
    const code = `E${1001 + i}`;
    const t = TEAMS[e.team];
    codeByName.set(e.name, code);
    await client.query(
      `INSERT INTO employee_relations_employees (code, name, title, department, unit, team, manager_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [code, e.name, t.titles[e.ti], t.department, t.unit, e.team, t.manager, e.status],
    );
  }
  const codeOf = (name: string) => {
    const code = codeByName.get(name);
    if (!code) throw new Error(`Unknown employee: ${name}`);
    return code;
  };

  const hash = await bcrypt.hash(PASSWORD, 10);
  const userIds = new Map<string, string>();
  for (const u of USERS) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO employee_relations_users (email, name, password_hash, role, manager_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [u.email, u.name, hash, u.role, u.managerCode],
    );
    userIds.set(u.email, rows[0].id);
  }
  const erUser = userIds.get("fatma@relations.local");

  const meetingIds: string[] = [];
  for (const [i, m] of MEETINGS.entries()) {
    const id = `MT-${String(i + 1).padStart(3, "0")}`;
    const codes = m.employees.map(codeOf);
    const team = employees.find((e) => e.name === m.employees[0])!.team;
    const t = TEAMS[team];
    meetingIds.push(id);
    await client.query(
      `INSERT INTO employee_relations_meetings (id, meeting_date, created_at, meeting_type, channel, department, unit, team,
         positive, risk, negative, recommendation, follow_up_note, pulse, pulse_note, created_by)
       VALUES ($1, $2, ($2::date + TIME '16:30'), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [id, m.date, m.type, m.channel, t.department, t.unit, team, m.positive, m.risk, m.negative,
        m.recommendation, m.followUpNote, m.pulse ? JSON.stringify(m.pulse) : null, m.pulseNote, erUser],
    );
    for (const code of codes) {
      await client.query(`INSERT INTO employee_relations_meeting_employees (meeting_id, employee_code) VALUES ($1, $2)`, [id, code]);
    }
  }

  for (const [i, [mi, item, target, status, note]] of FOLLOWUPS.entries()) {
    const id = `FU-${String(i + 1).padStart(3, "0")}`;
    const meeting = MEETINGS[mi - 1];
    await client.query(
      `INSERT INTO employee_relations_followups (id, meeting_id, item, target_date, status, note, created_at, closed_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, meetingIds[mi - 1], item, target, status, note, meeting.date, status === "Closed" ? target : null, erUser],
    );
    for (const name of meeting.employees) {
      await client.query(`INSERT INTO employee_relations_followup_employees (followup_id, employee_code) VALUES ($1, $2)`, [id, codeOf(name)]);
    }
  }

  for (const [i, f] of FEEDBACK.entries()) {
    const id = `FB-${String(i + 1).padStart(3, "0")}`;
    await client.query(
      `INSERT INTO employee_relations_manager_feedback (id, employee_code, manager_code, cycle, mode, body, language, status, ai_summary, feedback_date)
       VALUES ($1, $2, $3, $4, 'written', $5, 'English', 'Submitted', $6, $7)`,
      [id, codeOf(f.employee), f.manager, CYCLE, f.body, f.ai ? JSON.stringify(f.ai) : null, f.date],
    );
  }

  await client.query(
    `INSERT INTO employee_relations_id_sequences (name, value) VALUES ('meeting', $1), ('followup', $2), ('feedback', $3)
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`,
    [MEETINGS.length, FOLLOWUPS.length, FEEDBACK.length],
  );

  return { employees: employees.length };
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { employees } = await seed(client);
    await client.query("COMMIT");
    console.log(
      `Seeded ${MANAGERS.length} managers, ${employees} employees, ${USERS.length} users, ` +
        `${MEETINGS.length} meetings, ${FOLLOWUPS.length} follow-ups, ${FEEDBACK.length} feedback.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
