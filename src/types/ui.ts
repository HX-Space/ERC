import type { ReactNode } from "react";
import type { HTMLMotionProps } from "framer-motion";
import type {
  AppView,
  CreateMeetingInput,
  EmployeeRecord,
  FeedbackAiSummary,
  FeedbackMode,
  FeedbackStatus,
  FollowupRecord,
  ManagerFeedbackRecord,
  ManagerRecord,
  MeetingRecord,
  PulseScores,
  UserRecord,
  UserRole,
} from "@/types";

/* ---------- Server action results ---------- */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

export interface LoginState {
  error: string | null;
}

export interface CreateUserState {
  ok: boolean;
  error: string | null;
  message: string | null;
}

export type MeetingFormInput = Omit<CreateMeetingInput, "createdBy">;

export interface SaveFeedbackInput {
  employeeCode: string;
  managerCode: string;
  mode: FeedbackMode;
  body: string;
  language: string | null;
  hasAudio: boolean;
  status: Extract<FeedbackStatus, "Draft" | "Submitted">;
  aiSummary: FeedbackAiSummary | null;
  existingId?: string;
}

/* ---------- UI primitives ---------- */

export type ButtonVariant = "primary" | "ghost" | "danger" | "ai" | "sm";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  "aria-label": string;
}

export type Tone = "neutral" | "accent" | "risk" | "ok" | "warn" | "ai";

export interface PillProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export interface KpiProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}

export interface DataTableColumn {
  key: string;
  label: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface DataTableProps {
  columns: DataTableColumn[];
  children: ReactNode;
  caption?: string;
  className?: string;
}

export interface DataCellProps {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export interface DataRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export type ToastTone = "ok" | "risk" | "info";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  push: (toast: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => void;
}

export interface ChildrenProps {
  children: ReactNode;
}

export interface SkeletonProps {
  className?: string;
}

export interface PageSkeletonProps {
  rows?: number;
}

/* ---------- Shell ---------- */

export interface NavItem {
  view: AppView;
  label: string;
  href: string;
  description: string;
}

export interface SidebarNavProps {
  items: NavItem[];
  overdueCount: number;
  userName: string;
  roleLabel: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/* ---------- Meetings ---------- */

export interface MeetingsViewProps {
  meetings: MeetingRecord[];
  employees: EmployeeRecord[];
  departments: string[];
  followups: FollowupRecord[];
  canCreate: boolean;
  today: string;
}

export interface MeetingDrawerProps {
  open: boolean;
  onClose: () => void;
  meeting: MeetingRecord | null;
  meetingFollowups: FollowupRecord[];
  employees: EmployeeRecord[];
  departments: string[];
  today: string;
}

export interface MeetingFormProps {
  employees: EmployeeRecord[];
  departments: string[];
  today: string;
  onCreated: (meeting: MeetingRecord) => void;
  onCancel: () => void;
}

export interface MeetingDetailProps {
  meeting: MeetingRecord;
  followups: FollowupRecord[];
}

export interface PulseReviewProps {
  value: PulseScores;
  note: string;
  onChange: (value: PulseScores) => void;
  onNoteChange: (note: string) => void;
}

export interface AiAssistPanelProps {
  notes: {
    positive: string;
    risk: string;
    negative: string;
    recommendation: string;
    followUpNote: string;
    meetingDate: string;
  };
  summary: string;
  onSummaryChange: (summary: string) => void;
  onAddFollowup: (item: { item: string; targetDate: string }) => void;
}

export interface FollowupDraft {
  key: number;
  item: string;
  targetDate: string;
}

export interface FollowupDraftListProps {
  items: FollowupDraft[];
  onChange: (items: FollowupDraft[]) => void;
  defaultDate: string;
}

export interface EmployeePickerProps {
  employees: EmployeeRecord[];
  selected: string[];
  onChange: (codes: string[]) => void;
}

export interface AttentionItem {
  meeting: MeetingRecord;
  reason: string;
  tone: Tone;
}

export interface AttentionStripProps {
  items: AttentionItem[];
  onOpen: (meeting: MeetingRecord) => void;
}

export interface MeetingListProps {
  meetings: MeetingRecord[];
  onOpen: (meeting: MeetingRecord) => void;
}

/* ---------- Follow-ups ---------- */

export type FollowupFilter = "Open" | "Overdue" | "Closed" | "All";

export interface FollowupsViewProps {
  followups: FollowupRecord[];
  canClose: boolean;
  today: string;
}

export interface FollowupFiltersProps {
  value: FollowupFilter;
  counts: Record<FollowupFilter, number>;
  onChange: (value: FollowupFilter) => void;
}

export interface CloseFollowupDrawerProps {
  followup: FollowupRecord | null;
  onClose: () => void;
}

/* ---------- Employees ---------- */

export interface EmployeeFinderProps {
  employees: EmployeeRecord[];
  departments: string[];
  selectedCode: string | null;
}

export interface EmployeeHistoryProps {
  employee: EmployeeRecord;
  meetings: MeetingRecord[];
  followups: FollowupRecord[];
  feedback: ManagerFeedbackRecord[];
  today: string;
}

export interface PulseKpisProps {
  meetings: MeetingRecord[];
  followups: FollowupRecord[];
  today: string;
}

export interface PulseIndicatorsProps {
  meetings: MeetingRecord[];
}

export type TimelineEntry =
  | { kind: "meeting"; date: string; meeting: MeetingRecord }
  | { kind: "feedback"; date: string; feedback: ManagerFeedbackRecord };

export interface HistoryTimelineProps {
  entries: TimelineEntry[];
}

export interface EmployeeFollowupsProps {
  followups: FollowupRecord[];
  today: string;
}

/* ---------- Directory ---------- */

export interface DirectoryViewProps {
  employees: EmployeeRecord[];
  departments: string[];
}

/* ---------- Analytics ---------- */

export interface AnalyticsFiltersValue {
  department: string;
  period: "30" | "90" | "365" | "all";
}

export interface AnalyticsFiltersProps {
  departments: string[];
  value: AnalyticsFiltersValue;
}

export interface DepartmentStat {
  department: string;
  meetings: number;
  avgPulse: number | null;
  riskSignals: number;
}

export interface ThemeInsight {
  label: string;
  mentions: number;
  teams: string[];
  recommendation?: string;
}

export interface AnalyticsSummary {
  meetings: number;
  employeesReached: number;
  avgPulse: number | null;
  riskSignals: number;
  followups: { open: number; overdue: number; closed: number };
  departments: DepartmentStat[];
  riskThemes: ThemeInsight[];
  positiveThemes: ThemeInsight[];
}

export interface AnalyticsKpisProps {
  summary: AnalyticsSummary;
}

export interface DepartmentBarsProps {
  stats: DepartmentStat[];
}

export interface FollowupStatusBarProps {
  open: number;
  overdue: number;
  closed: number;
}

export interface AiInsightsProps {
  riskThemes: ThemeInsight[];
  positiveThemes: ThemeInsight[];
}

/* ---------- Feedback ---------- */

export interface TeamMemberFeedback {
  employee: EmployeeRecord;
  feedback: ManagerFeedbackRecord | null;
}

export interface FeedbackViewProps {
  team: TeamMemberFeedback[];
  managerCode: string;
  managerName: string;
  cycle: string;
}

export interface ManagerPickerProps {
  managers: ManagerRecord[];
  value: string;
}

export interface TeamListProps {
  team: TeamMemberFeedback[];
  onOpen: (member: TeamMemberFeedback) => void;
}

export interface FeedbackDrawerProps {
  member: TeamMemberFeedback | null;
  managerCode: string;
  cycle: string;
  onClose: () => void;
}

export interface VoiceRecorderProps {
  employeeName: string;
  employeeTitle: string;
  language: string;
  onTranscript: (text: string) => void;
}

export interface FeedbackAiPanelProps {
  summary: FeedbackAiSummary | null;
}

export interface FeedbackProgressProps {
  total: number;
  submitted: number;
  drafts: number;
}

/* ---------- Admin ---------- */

export interface AdminViewProps {
  users: UserRecord[];
  managers: ManagerRecord[];
  currentUserId: string;
}

export interface UsersTableProps {
  users: UserRecord[];
  managers: ManagerRecord[];
  currentUserId: string;
}

export interface UserRowProps {
  user: UserRecord;
  managers: ManagerRecord[];
  isSelf: boolean;
}

export interface CreateUserFormProps {
  managers: ManagerRecord[];
}

export interface RoleOption {
  value: UserRole;
  label: string;
}
