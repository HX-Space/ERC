"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, UserPlus } from "lucide-react";
import {
  importDirectoryAction,
  saveEmployeeAction,
  saveManagerAction,
  setEmployeeStatusAction,
} from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import type { EmployeeRecord, ManagerRecord } from "@/types";

type Sheet = "import" | "manager" | "employee" | null;

const CSV_HEADER = "code,name,title,department,unit,team,manager_code,manager_name,manager_title,status";
const CSV_EXAMPLE = `${CSV_HEADER}
E1001,Ahmed Saeed,Customer Care Agent,Operations,Customer Care,Inbound,M01,Karim Fawzy,Customer Care Manager,Active`;

const input =
  "h-9 w-full rounded-[6px] border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent";

const emptyEmployee = {
  code: "",
  name: "",
  title: "",
  department: "",
  unit: "",
  team: "",
  managerCode: "",
  status: "Active" as "Active" | "Inactive",
};

export function DirectoryView({
  employees,
  managers,
  isAdmin,
}: {
  employees: EmployeeRecord[];
  managers: ManagerRecord[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [mgr, setMgr] = useState({ code: "", name: "", title: "" });
  const [emp, setEmp] = useState(emptyEmployee);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter((e) =>
      [e.code, e.name, e.title, e.department, e.team, e.managerName ?? ""].join(" ").toLowerCase().includes(s),
    );
  }, [employees, q]);

  const known = useMemo(
    () => ({
      departments: [...new Set(employees.map((e) => e.department))].sort(),
      units: [...new Set(employees.map((e) => e.unit))].sort(),
      teams: [...new Set(employees.map((e) => e.team))].sort(),
    }),
    [employees],
  );

  async function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      toast(result.error);
      return false;
    }
    toast(result.message);
    router.refresh();
    return true;
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Directory</h1>
          <p>
            {employees.length} employees · {managers.length} managers. The employee code is the
            permanent key used in meetings and feedback.
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button aria-label="Import directory from CSV" onClick={() => setSheet("import")}>
              <Upload />
              Import CSV
            </Button>
            <Button aria-label="Add manager" onClick={() => setSheet("manager")}>
              <UserPlus />
              Add manager
            </Button>
            <Button
              variant="primary"
              aria-label="Add employee"
              onClick={() => {
                setEmp({ ...emptyEmployee, managerCode: managers[0]?.code ?? "" });
                setSheet("employee");
              }}
            >
              <Plus />
              Add employee
            </Button>
          </div>
        ) : null}
      </header>

      <Panel>
        <PanelHeader title="People">
          <input
            aria-label="Search directory"
            placeholder="Search name, code, team or manager"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${input} max-w-[300px]`}
          />
        </PanelHeader>
        {employees.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="rounded-[8px] border border-dashed border-line-2 px-4 py-3 text-[14px] text-muted">
              No employees yet.{" "}
              {isAdmin
                ? "Import your directory as a CSV, or add managers and employees one by one."
                : "An administrator needs to import the directory before meetings can be recorded."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Unit</th>
                  <th>Team</th>
                  <th>Manager</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.code}>
                    <td className="mono whitespace-nowrap text-muted">{e.code}</td>
                    <td className="text-ink">{e.name}</td>
                    <td>{e.title}</td>
                    <td>{e.department}</td>
                    <td>{e.unit}</td>
                    <td>{e.team}</td>
                    <td className="whitespace-nowrap">
                      {e.managerName} <span className="mono text-[12px] text-muted">{e.managerCode}</span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <button
                          type="button"
                          aria-label={`Mark ${e.name} ${e.status === "Active" ? "inactive" : "active"}`}
                          className="cursor-pointer"
                          onClick={() =>
                            run(() =>
                              setEmployeeStatusAction(e.code, e.status === "Active" ? "Inactive" : "Active"),
                            )
                          }
                        >
                          <Pill tone={e.status === "Active" ? "ok" : "mute"}>{e.status}</Pill>
                        </button>
                      ) : (
                        <Pill tone={e.status === "Active" ? "ok" : "mute"}>{e.status}</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Import */}
      <Drawer
        open={sheet === "import"}
        title="Import directory"
        onClose={() => setSheet(null)}
        footer={
          <>
            <Button aria-label="Cancel import" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              aria-label="Run import"
              disabled={busy || !csv.trim()}
              onClick={async () => {
                if (await run(() => importDirectoryAction(csv))) {
                  setCsv("");
                  setSheet(null);
                }
              }}
            >
              {busy ? "Importing…" : "Import"}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-muted">
          One row per employee. Managers are created or updated from the manager columns. Existing
          codes are updated, new codes are added; nothing is deleted. Status is Active or Inactive
          and defaults to Active.
        </p>
        <pre className="overflow-x-auto rounded-[8px] bg-surface-2 p-3 text-[12px] leading-5">{CSV_EXAMPLE}</pre>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-label="Choose CSV file"
            className="text-[14px]"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setCsv(await file.text());
            }}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-medium">Or paste the rows</span>
          <textarea
            aria-label="CSV rows"
            rows={12}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={CSV_HEADER}
            className="rounded-[6px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] outline-none focus:border-accent"
          />
        </label>
      </Drawer>

      {/* Manager */}
      <Drawer
        open={sheet === "manager"}
        title="Add manager"
        onClose={() => setSheet(null)}
        footer={
          <>
            <Button aria-label="Cancel manager" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              aria-label="Save manager"
              disabled={busy}
              onClick={async () => {
                if (await run(() => saveManagerAction(mgr))) {
                  setMgr({ code: "", name: "", title: "" });
                  setSheet(null);
                }
              }}
            >
              Save manager
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-muted">
          A manager owns a team in the directory. To let them sign in, create a Manager account in
          Admin and link it to this code.
        </p>
        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Labelled label="Code">
            <input className={input} value={mgr.code} onChange={(e) => setMgr({ ...mgr, code: e.target.value })} placeholder="M06" />
          </Labelled>
          <Labelled label="Name">
            <input className={input} value={mgr.name} onChange={(e) => setMgr({ ...mgr, name: e.target.value })} />
          </Labelled>
        </div>
        <Labelled label="Title">
          <input className={input} value={mgr.title} onChange={(e) => setMgr({ ...mgr, title: e.target.value })} />
        </Labelled>
        {managers.length ? (
          <p className="text-[12px] text-muted">
            Existing codes: {managers.map((m) => m.code).join(", ")}. Saving an existing code updates it.
          </p>
        ) : null}
      </Drawer>

      {/* Employee */}
      <Drawer
        open={sheet === "employee"}
        title="Add employee"
        onClose={() => setSheet(null)}
        footer={
          <>
            <Button aria-label="Cancel employee" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              aria-label="Save employee"
              disabled={busy || !managers.length}
              onClick={async () => {
                if (await run(() => saveEmployeeAction(emp))) setSheet(null);
              }}
            >
              Save employee
            </Button>
          </>
        }
      >
        {!managers.length ? (
          <p className="rounded-[6px] bg-warn-soft px-3 py-2 text-[13px] text-warn">
            Add a manager first: every employee reports to one.
          </p>
        ) : null}
        <datalist id="dir-departments">{known.departments.map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="dir-units">{known.units.map((v) => <option key={v} value={v} />)}</datalist>
        <datalist id="dir-teams">{known.teams.map((v) => <option key={v} value={v} />)}</datalist>
        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Labelled label="Code">
            <input className={input} value={emp.code} onChange={(e) => setEmp({ ...emp, code: e.target.value })} placeholder="E1045" />
          </Labelled>
          <Labelled label="Full name">
            <input className={input} value={emp.name} onChange={(e) => setEmp({ ...emp, name: e.target.value })} />
          </Labelled>
        </div>
        <Labelled label="Job title">
          <input className={input} value={emp.title} onChange={(e) => setEmp({ ...emp, title: e.target.value })} />
        </Labelled>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Department">
            <input list="dir-departments" className={input} value={emp.department} onChange={(e) => setEmp({ ...emp, department: e.target.value })} />
          </Labelled>
          <Labelled label="Unit">
            <input list="dir-units" className={input} value={emp.unit} onChange={(e) => setEmp({ ...emp, unit: e.target.value })} />
          </Labelled>
          <Labelled label="Team">
            <input list="dir-teams" className={input} value={emp.team} onChange={(e) => setEmp({ ...emp, team: e.target.value })} />
          </Labelled>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Manager">
            <select className={input} value={emp.managerCode} onChange={(e) => setEmp({ ...emp, managerCode: e.target.value })}>
              {managers.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} · {m.code}
                </option>
              ))}
            </select>
          </Labelled>
          <Labelled label="Status">
            <select
              className={input}
              value={emp.status}
              onChange={(e) => setEmp({ ...emp, status: e.target.value as "Active" | "Inactive" })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Labelled>
        </div>
      </Drawer>
    </>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-[14px] font-medium">{label}</span>
      {children}
    </label>
  );
}
