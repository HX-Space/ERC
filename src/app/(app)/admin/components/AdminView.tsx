"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/lib/constants";
import type { ManagerRecord, UserRecord, UserRole } from "@/types";

const ROLES: UserRole[] = ["ADMIN", "ER", "HR", "MANAGER"];

export function AdminView({
  users,
  managers,
}: {
  users: UserRecord[];
  managers: ManagerRecord[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ER");
  const [managerCode, setManagerCode] = useState("");

  async function createUser() {
    const result = await createUserAction({
      email,
      name,
      password,
      role,
      managerCode: role === "MANAGER" ? managerCode || null : null,
    });
    if (!result.ok) {
      toast(result.error);
      return;
    }
    toast("User created.");
    setEmail("");
    setName("");
    setPassword("");
    router.refresh();
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Admin</h1>
          <p>Users, roles, and access across the workspace.</p>
        </div>
      </header>

      <Panel>
        <PanelHeader title="Create user" />
        <PanelBody>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label="Temporary password">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            {role === "MANAGER" ? (
              <Field label="Linked manager">
                <select
                  value={managerCode}
                  onChange={(e) => setManagerCode(e.target.value)}
                  className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
                >
                  <option value="">
                    {managers.length ? "Select manager" : "Add managers in Directory first"}
                  </option>
                  {managers.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} · {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              aria-label="Create user"
              onClick={createUser}
            >
              Create user
            </Button>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Users" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={`Role for ${u.name}`}
                      className="rounded-lg border border-line-2 px-2 py-1 outline-none"
                      value={u.role}
                      onChange={async (e) => {
                        const result = await updateUserRoleAction({
                          id: u.id,
                          role: e.target.value as UserRole,
                          managerCode: u.managerCode,
                        });
                        toast(result.ok ? "Role updated." : result.error);
                        router.refresh();
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="mono px-3 py-3">{u.managerCode ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Pill tone={u.isActive ? "ok" : "mute"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      size="sm"
                      variant={u.isActive ? "danger" : "primary"}
                      aria-label={
                        u.isActive
                          ? `Disable ${u.name}`
                          : `Enable ${u.name}`
                      }
                      onClick={async () => {
                        const result = await setUserActiveAction(u.id, !u.isActive);
                        toast(
                          !result.ok
                            ? result.error
                            : u.isActive
                              ? "User disabled."
                              : "User enabled.",
                        );
                        router.refresh();
                      }}
                    >
                      {u.isActive ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
