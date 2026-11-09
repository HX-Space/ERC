import type { AppView, UserRole } from "@/types";

export const APP_NAME = "Relations Hub";
export const APP_TAGLINE = "Employee Relations";
export const FEEDBACK_CYCLE = "Year-end 2026";

export const PULSE_INDICATORS = [
  {
    key: "c" as const,
    label: "Communication Skills",
    hint: "Clarity, organised thoughts, getting ideas across",
  },
  {
    key: "a" as const,
    label: "Attitude & Professionalism",
    hint: "Conduct, respect, openness to feedback",
  },
  {
    key: "d" as const,
    label: "Development Readiness",
    hint: "Willingness to learn and improve",
  },
  {
    key: "i" as const,
    label: "Initiative & Problem Solving",
    hint: "Proactive, suggests solutions",
  },
  {
    key: "l" as const,
    label: "Leadership Potential Signals",
    hint: "Ownership, team thinking, supports others",
  },
  {
    key: "s" as const,
    label: "Confidence & Self-Expression",
    hint: "Shares opinions, ideas and concerns",
  },
];

export const PULSE_SCALE: Record<number, string> = {
  1: "Needs Attention",
  2: "Below Expectations",
  3: "Satisfactory",
  4: "Strong",
  5: "Excellent",
};

export const OUTCOME_SECTIONS = [
  {
    key: "positive" as const,
    label: "Positive Feedback",
    hint: "Strengths, improvements, good experiences",
    tone: "pos",
  },
  {
    key: "risk" as const,
    label: "Concerns & Risks",
    hint: "Early warning signals, issues that may grow",
    tone: "risk",
  },
  {
    key: "negative" as const,
    label: "Negative Feedback",
    hint: "Existing problems, dissatisfaction",
    tone: "neg",
  },
  {
    key: "recommendation" as const,
    label: "Recommendations",
    hint: "Corrective actions and improvement ideas",
    tone: "rec",
  },
  {
    key: "followUpNote" as const,
    label: "Follow-up Required",
    hint: "Items to revisit later",
    tone: "fu",
  },
];

export const ROLE_VIEWS: Record<UserRole, AppView[]> = {
  ADMIN: [
    "dashboard",
    "meetings",
    "follow-ups",
    "employees",
    "directory",
    "analytics",
    "feedback",
    "admin",
  ],
  ER: ["dashboard", "meetings", "follow-ups", "employees", "directory"],
  HR: ["dashboard", "analytics", "employees", "follow-ups"],
  MANAGER: ["feedback"],
};

export const VIEW_META: Record<
  AppView,
  { label: string; href: string; description: string }
> = {
  dashboard: {
    label: "Overview",
    href: "/dashboard",
    description: "What needs attention across ER casework",
  },
  meetings: {
    label: "Meetings",
    href: "/meetings",
    description: "ER meeting records and pulse reviews",
  },
  "follow-ups": {
    label: "Follow-ups",
    href: "/follow-ups",
    description: "Open actions from ER meetings",
  },
  employees: {
    label: "History",
    href: "/employees",
    description: "Timeline of meetings and manager feedback",
  },
  directory: {
    label: "Directory",
    href: "/directory",
    description: "Employees, teams and managers",
  },
  analytics: {
    label: "Analytics",
    href: "/analytics",
    description: "Organisation-wide ER signals",
  },
  feedback: {
    label: "Feedback",
    href: "/feedback",
    description: "Cycle feedback for your team",
  },
  admin: {
    label: "Admin",
    href: "/admin",
    description: "Users, roles and access",
  },
};

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  ER: "/dashboard",
  HR: "/dashboard",
  MANAGER: "/feedback",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  ER: "ER Specialist",
  HR: "HR / Management",
  MANAGER: "Manager",
};
