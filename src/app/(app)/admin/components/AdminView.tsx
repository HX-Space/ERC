"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useToast } from "@/components/ui/toast";
import { useLang, useT } from "@/components/i18n/lang";
import { ROLE_LABELS, ROLE_LABELS_AR } from "@/lib/constants";
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
  const t = useT();
  const lang = useLang();
  const roleLabel = (r: UserRole) => (lang === "ar" ? ROLE_LABELS_AR[r] : ROLE_LABELS[r]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ER");
  const [managerCode, setManagerCode] = useState("");
  const [resetting, setResetting] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function closeReset() {
    setResetting(null);
    setNewPassword("");
  }

  async function resetPassword() {
    if (!resetting) return;
    setSaving(true);
    const result = await resetUserPasswordAction(resetting.id, newPassword);
    setSaving(false);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    toast(t(`Password reset for ${resetting.name}.`, `تمت إعادة تعيين كلمة المرور لـ ${resetting.name}.`));
    closeReset();
  }

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
    toast(t("User created.", "تم إنشاء المستخدم."));
    setEmail("");
    setName("");
    setPassword("");
    router.refresh();
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("Admin", "الإدارة")}</h1>
          <p>{t("Users, roles, and access across the workspace.", "المستخدمون والأدوار والصلاحيات في مساحة العمل.")}</p>
        </div>
      </header>

      <Panel>
        <PanelHeader title={t("Create user", "إنشاء مستخدم")} />
        <PanelBody>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label={t("Name", "الاسم")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label={t("Email", "البريد الإلكتروني")}>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label={t("Temporary password", "كلمة المرور المؤقتة")}>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              />
            </Field>
            <Field label={t("Role", "الدور")}>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </Field>
            {role === "MANAGER" ? (
              <Field label={t("Linked manager", "المدير المرتبط")}>
                <select
                  value={managerCode}
                  onChange={(e) => setManagerCode(e.target.value)}
                  className="w-full rounded-lg border border-line-2 px-3 py-2 outline-none"
                >
                  <option value="">
                    {managers.length
                      ? t("Select manager", "اختر المدير")
                      : t("Add managers in Directory first", "أضف المديرين في الدليل أولاً")}
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
              aria-label={t("Create user", "إنشاء مستخدم")}
              onClick={createUser}
            >
              {t("Create user", "إنشاء مستخدم")}
            </Button>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={t("Users", "المستخدمون")} />
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="px-3 py-2">{t("Name", "الاسم")}</th>
                <th className="px-3 py-2">{t("Email", "البريد الإلكتروني")}</th>
                <th className="px-3 py-2">{t("Role", "الدور")}</th>
                <th className="px-3 py-2">{t("Manager", "المدير")}</th>
                <th className="px-3 py-2">{t("Status", "الحالة")}</th>
                <th className="px-3 py-2">{t("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{u.name}</td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3">
                    <select
                      aria-label={t(`Role for ${u.name}`, `الدور لـ ${u.name}`)}
                      className="rounded-lg border border-line-2 px-2 py-1 outline-none"
                      value={u.role}
                      onChange={async (e) => {
                        const result = await updateUserRoleAction({
                          id: u.id,
                          role: e.target.value as UserRole,
                          managerCode: u.managerCode,
                        });
                        toast(result.ok ? t("Role updated.", "تم تحديث الدور.") : result.error);
                        router.refresh();
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="mono px-3 py-3">{u.managerCode ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Pill tone={u.isActive ? "ok" : "mute"}>
                      {u.isActive ? t("Active", "نشط") : t("Disabled", "معطّل")}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      aria-label={t(`Reset password for ${u.name}`, `إعادة تعيين كلمة المرور لـ ${u.name}`)}
                      onClick={() => {
                        setNewPassword("");
                        setResetting(u);
                      }}
                    >
                      {t("Reset password", "إعادة تعيين كلمة المرور")}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.isActive ? "danger" : "primary"}
                      aria-label={
                        u.isActive
                          ? t(`Disable ${u.name}`, `تعطيل ${u.name}`)
                          : t(`Enable ${u.name}`, `تفعيل ${u.name}`)
                      }
                      onClick={async () => {
                        const result = await setUserActiveAction(u.id, !u.isActive);
                        toast(
                          !result.ok
                            ? result.error
                            : u.isActive
                              ? t("User disabled.", "تم تعطيل المستخدم.")
                              : t("User enabled.", "تم تفعيل المستخدم."),
                        );
                        router.refresh();
                      }}
                    >
                      {u.isActive ? t("Disable", "تعطيل") : t("Enable", "تفعيل")}
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Drawer
        open={Boolean(resetting)}
        title={t("Reset password", "إعادة تعيين كلمة المرور")}
        onClose={closeReset}
        width={480}
        footer={
          <>
            <Button aria-label={t("Cancel password reset", "إلغاء إعادة تعيين كلمة المرور")} onClick={closeReset}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="primary"
              aria-label={t("Save new password", "حفظ كلمة المرور الجديدة")}
              disabled={saving}
              onClick={resetPassword}
            >
              {saving ? t("Saving…", "جارٍ الحفظ…") : t("Save new password", "حفظ كلمة المرور الجديدة")}
            </Button>
          </>
        }
      >
        {resetting ? (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{resetting.name}</p>
              <p className="text-sm text-muted" dir="ltr">
                {resetting.email}
              </p>
            </div>
            <Field label={t("New temporary password", "كلمة مرور مؤقتة جديدة")}>
              <input
                type="text"
                dir="ltr"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-lg border border-line-2 bg-surface px-3 py-2 outline-none"
              />
            </Field>
            <p className="text-xs text-muted">
              {t(
                "At least 10 characters. Share it with the user privately and ask them to keep it safe.",
                "10 أحرف على الأقل. شاركها مع المستخدم بشكل خاص واطلب منه الحفاظ عليها.",
              )}
            </p>
          </div>
        ) : null}
      </Drawer>
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
