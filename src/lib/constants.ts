import type { AppView, UserRole } from "@/types";

export const APP_NAME = "Relations Hub";
export const APP_TAGLINE = "Employee Relations";
export const FEEDBACK_CYCLE = "Year-end 2026";

export const PULSE_INDICATORS = [
  {
    key: "c" as const,
    label: "Communication Skills",
    labelAr: "مهارات التواصل",
    hint: "Clarity, organised thoughts, getting ideas across",
    hintAr: "الوضوح وتنظيم الأفكار وإيصالها",
  },
  {
    key: "a" as const,
    label: "Attitude & Professionalism",
    labelAr: "السلوك والاحترافية",
    hint: "Conduct, respect, openness to feedback",
    hintAr: "السلوك والاحترام وتقبّل الملاحظات",
  },
  {
    key: "d" as const,
    label: "Development Readiness",
    labelAr: "الجاهزية للتطوير",
    hint: "Willingness to learn and improve",
    hintAr: "الرغبة في التعلّم والتحسّن",
  },
  {
    key: "i" as const,
    label: "Initiative & Problem Solving",
    labelAr: "المبادرة وحل المشكلات",
    hint: "Proactive, suggests solutions",
    hintAr: "استباقي ويقترح حلولاً",
  },
  {
    key: "l" as const,
    label: "Leadership Potential Signals",
    labelAr: "مؤشرات القدرة القيادية",
    hint: "Ownership, team thinking, supports others",
    hintAr: "تحمّل المسؤولية والتفكير الجماعي ودعم الآخرين",
  },
  {
    key: "s" as const,
    label: "Confidence & Self-Expression",
    labelAr: "الثقة والتعبير عن الذات",
    hint: "Shares opinions, ideas and concerns",
    hintAr: "يشارك آراءه وأفكاره ومخاوفه",
  },
];

export const PULSE_SCALE: Record<number, string> = {
  1: "Needs Attention",
  2: "Below Expectations",
  3: "Satisfactory",
  4: "Strong",
  5: "Excellent",
};

export const PULSE_SCALE_AR: Record<number, string> = {
  1: "يحتاج إلى اهتمام",
  2: "أقل من المتوقع",
  3: "مُرضٍ",
  4: "قوي",
  5: "ممتاز",
};

export const OUTCOME_SECTIONS = [
  {
    key: "positive" as const,
    label: "Positive Feedback",
    labelAr: "ملاحظات إيجابية",
    hint: "Strengths, improvements, good experiences",
    hintAr: "نقاط القوة والتحسّن والتجارب الجيدة",
    tone: "pos",
  },
  {
    key: "risk" as const,
    label: "Concerns & Risks",
    labelAr: "مخاوف ومخاطر",
    hint: "Early warning signals, issues that may grow",
    hintAr: "إشارات إنذار مبكر ومشكلات قد تتفاقم",
    tone: "risk",
  },
  {
    key: "negative" as const,
    label: "Negative Feedback",
    labelAr: "ملاحظات سلبية",
    hint: "Existing problems, dissatisfaction",
    hintAr: "مشكلات قائمة وعدم رضا",
    tone: "neg",
  },
  {
    key: "recommendation" as const,
    label: "Recommendations",
    labelAr: "التوصيات",
    hint: "Corrective actions and improvement ideas",
    hintAr: "إجراءات تصحيحية وأفكار للتحسين",
    tone: "rec",
  },
  {
    key: "followUpNote" as const,
    label: "Follow-up Required",
    labelAr: "متابعة مطلوبة",
    hint: "Items to revisit later",
    hintAr: "بنود يُعاد النظر فيها لاحقاً",
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
  { label: string; labelAr: string; href: string; description: string; descriptionAr: string }
> = {
  dashboard: {
    label: "Overview",
    labelAr: "نظرة عامة",
    href: "/dashboard",
    description: "What needs attention across ER casework",
    descriptionAr: "ما يحتاج إلى اهتمام في حالات علاقات الموظفين",
  },
  meetings: {
    label: "Meetings",
    labelAr: "الاجتماعات",
    href: "/meetings",
    description: "ER meeting records and pulse reviews",
    descriptionAr: "سجلات اجتماعات علاقات الموظفين ومراجعات النبض",
  },
  "follow-ups": {
    label: "Follow-ups",
    labelAr: "المتابعات",
    href: "/follow-ups",
    description: "Open actions from ER meetings",
    descriptionAr: "الإجراءات المفتوحة من اجتماعات علاقات الموظفين",
  },
  employees: {
    label: "History",
    labelAr: "السجل",
    href: "/employees",
    description: "Timeline of meetings and manager feedback",
    descriptionAr: "الخط الزمني للاجتماعات وملاحظات المديرين",
  },
  directory: {
    label: "Directory",
    labelAr: "الدليل",
    href: "/directory",
    description: "Employees, teams and managers",
    descriptionAr: "الموظفون والفرق والمديرون",
  },
  analytics: {
    label: "Analytics",
    labelAr: "التحليلات",
    href: "/analytics",
    description: "Organisation-wide ER signals",
    descriptionAr: "مؤشرات علاقات الموظفين على مستوى المؤسسة",
  },
  feedback: {
    label: "Feedback",
    labelAr: "الملاحظات",
    href: "/feedback",
    description: "Cycle feedback for your team",
    descriptionAr: "ملاحظات الدورة لفريقك",
  },
  admin: {
    label: "Admin",
    labelAr: "الإدارة",
    href: "/admin",
    description: "Users, roles and access",
    descriptionAr: "المستخدمون والأدوار والصلاحيات",
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
  ER: "ERC",
  HR: "HR / Management",
  MANAGER: "Manager",
};

export const ROLE_LABELS_AR: Record<UserRole, string> = {
  ADMIN: "مسؤول النظام",
  ER: "ERC",
  HR: "الموارد البشرية / الإدارة",
  MANAGER: "مدير",
};
