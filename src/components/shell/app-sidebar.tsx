"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/format";
import type { AppView } from "@/types";

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const ICONS: Record<AppView, Icon> = {
  dashboard: LayoutDashboard,
  meetings: CalendarDays,
  "follow-ups": ClipboardList,
  employees: Users,
  directory: FolderOpen,
  analytics: BarChart3,
  feedback: MessageSquareText,
  admin: Shield,
};

const GROUPS: Array<{ label: string; views: AppView[] }> = [
  { label: "Casework", views: ["dashboard", "meetings", "follow-ups", "employees"] },
  { label: "People", views: ["directory", "feedback"] },
  { label: "Insight", views: ["analytics"] },
  { label: "Workspace", views: ["admin"] },
];

const STORAGE_KEY = "er-sidebar-collapsed";

type NavItem = { view: AppView; label: string; href: string };

/** The product mark: two linked rings, the relation between employee and organisation. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="var(--accent)" />
      <circle cx="11" cy="14" r="5.25" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
      <circle cx="17" cy="14" r="5.25" fill="none" stroke="var(--accent-ink)" strokeWidth="2" opacity="0.7" />
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function NavList({
  items,
  overdueCount,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  overdueCount: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const byView = new Map(items.map((i) => [i.view, i]));

  return (
    <nav aria-label="Sections" className="flex flex-col">
      {GROUPS.map((group, gi) => {
        const groupItems = group.views
          .map((v) => byView.get(v))
          .filter((v): v is NavItem => !!v);
        if (!groupItems.length) return null;
        return (
          <div key={group.label} className={cn(gi > 0 && (collapsed ? "mt-3 border-t border-line pt-3" : "mt-5"))}>
            {!collapsed ? (
              <p className="mb-1.5 px-2.5 text-[12px] text-faint">{group.label}</p>
            ) : null}
            <ul className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
              {groupItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = ICONS[item.view];
                const showCount = item.view === "follow-ups" && overdueCount > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={
                        showCount ? `${item.label}, ${overdueCount} overdue` : item.label
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex items-center rounded-[6px] outline-none transition-colors duration-150",
                        collapsed ? "size-9 justify-center" : "h-8 gap-2.5 px-2.5 text-[14px]",
                        active
                          ? "bg-active font-medium text-ink"
                          : "text-muted hover:bg-active/60 hover:text-ink",
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.6} />
                      {!collapsed ? (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {showCount ? (
                            <span className="num text-[12px] font-medium text-risk">
                              {overdueCount} late
                            </span>
                          ) : null}
                        </>
                      ) : showCount ? (
                        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-risk" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserRow({
  name,
  roleLabel,
  collapsed,
}: {
  name: string;
  roleLabel: string;
  collapsed: boolean;
}) {
  const signOutButton = (
    <button
      type="button"
      aria-label="Sign out"
      title="Sign out"
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-muted outline-none transition-colors hover:bg-active hover:text-ink"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-4" strokeWidth={1.6} />
    </button>
  );

  if (collapsed) {
    return <div className="flex justify-center">{signOutButton}</div>;
  }

  return (
    <div className="flex items-center gap-2.5 px-1">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-medium text-accent"
      >
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{name}</p>
        <p className="truncate text-[12px] text-muted">{roleLabel}</p>
      </div>
      {signOutButton}
    </div>
  );
}

const iconButtonBase =
  "size-8 cursor-pointer items-center justify-center rounded-[6px] text-muted outline-none transition-colors hover:bg-active hover:text-ink";
const iconButton = `inline-flex ${iconButtonBase}`;

/**
 * Framed-sheet shell: the sidebar and the 48px top bar share the tinted frame with no
 * rule between them; the page sits on a white sheet inset 8px from the right and
 * bottom edges. Below md the frame folds into a top bar and a full-screen menu.
 */
export function AppShell({
  items,
  overdueCount,
  userName,
  roleLabel,
  todayLabel,
  children,
}: {
  items: NavItem[];
  overdueCount: number;
  userName: string;
  roleLabel: string;
  todayLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const current = items.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col py-3 transition-[width] duration-200 md:flex",
          collapsed ? "w-[60px] items-center px-0" : "w-[228px] px-3",
        )}
      >
        <div className={cn("flex h-9 items-center", collapsed ? "justify-center" : "gap-2.5 px-1.5")}>
          <BrandMark className="size-7 shrink-0" />
          {!collapsed ? (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] font-semibold text-ink">Relations Hub</p>
              <p className="truncate text-[12px] text-muted">Employee Relations</p>
            </div>
          ) : null}
        </div>

        <div className={cn("mt-6 flex-1 overflow-y-auto", collapsed && "w-full")}>
          <NavList items={items} overdueCount={overdueCount} collapsed={collapsed} />
        </div>

        <div className={cn("pt-3", collapsed && "w-full")}>
          <UserRow name={userName} roleLabel={roleLabel} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — shares the frame ground, no rule */}
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 bg-bg px-3 md:static md:pr-3 md:pl-0">
          <button
            type="button"
            aria-label="Open menu"
            className={cn(iconButton, "md:hidden")}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-[18px]" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(iconButtonBase, "hidden md:inline-flex")}
            onClick={toggle}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" strokeWidth={1.6} />
            ) : (
              <PanelLeftClose className="size-4" strokeWidth={1.6} />
            )}
          </button>
          <p className="flex min-w-0 items-center gap-2 text-[14px]">
            <span className="hidden text-muted sm:inline">Relations Hub</span>
            <span className="hidden text-faint sm:inline" aria-hidden>
              /
            </span>
            <span className="truncate font-medium text-ink">{current?.label ?? ""}</span>
          </p>
          <div className="ml-auto flex items-center gap-1">
            <span className="num mr-2 hidden text-[13px] text-muted sm:inline">{todayLabel}</span>
            <ThemeToggle />
          </div>
        </header>

        {/* The sheet */}
        <main className="min-w-0 flex-1 bg-surface px-4 py-6 md:mr-2 md:mb-2 md:rounded-[var(--radius-sheet)] md:border md:border-line md:px-8 md:py-7">
          <div className="page-stack w-full">{children}</div>
        </main>
      </div>

      {/* Phone menu */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-bg p-3 md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-10 items-center gap-2.5 px-1">
              <BrandMark className="size-7" />
              <p className="flex-1 text-[15px] font-semibold">Relations Hub</p>
              <button
                type="button"
                aria-label="Close menu"
                className={iconButton}
                onClick={() => setMenuOpen(false)}
              >
                <X className="size-[18px]" strokeWidth={1.6} />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto [&_a]:h-11 [&_a]:text-[15px]">
              <NavList
                items={items}
                overdueCount={overdueCount}
                collapsed={false}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
            <UserRow name={userName} roleLabel={roleLabel} collapsed={false} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
