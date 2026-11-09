export type UserRole = "ADMIN" | "ER" | "HR" | "MANAGER";

export type EmployeeStatus = "Active" | "Inactive";
export type MeetingType = "Individual" | "Group";
export type MeetingChannel = "Face-to-Face" | "Online" | "Phone";
export type FollowupStatus = "Open" | "Closed";
export type FeedbackStatus = "Pending" | "Draft" | "Submitted";
export type FeedbackMode = "written" | "voice";

export type AppView =
  | "dashboard"
  | "meetings"
  | "follow-ups"
  | "employees"
  | "directory"
  | "analytics"
  | "feedback"
  | "admin";

export interface PulseScores {
  c: number | "NO" | null;
  a: number | "NO" | null;
  d: number | "NO" | null;
  i: number | "NO" | null;
  l: number | "NO" | null;
  s: number | "NO" | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  managerCode: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ManagerRecord {
  code: string;
  name: string;
  title: string;
}

export interface EmployeeRecord {
  code: string;
  name: string;
  title: string;
  department: string;
  unit: string;
  team: string;
  managerCode: string;
  managerName?: string;
  status: EmployeeStatus;
}

export interface MeetingRecord {
  id: string;
  meetingDate: string;
  createdAt: string;
  meetingType: MeetingType;
  channel: MeetingChannel;
  department: string;
  unit: string;
  team: string;
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  pulse: PulseScores | null;
  pulseNote: string;
  aiSummary: string;
  employeeCodes: string[];
  employeeNames?: string[];
}

export interface FollowupRecord {
  id: string;
  meetingId: string;
  item: string;
  targetDate: string;
  status: FollowupStatus;
  note: string;
  createdAt: string;
  closedAt: string | null;
  employeeCodes: string[];
  employeeNames?: string[];
}

export interface FeedbackAiSummary {
  strengths: string[];
  development: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ManagerFeedbackRecord {
  id: string;
  employeeCode: string;
  managerCode: string;
  cycle: string;
  mode: FeedbackMode;
  body: string;
  language: string | null;
  hasAudio: boolean;
  status: FeedbackStatus;
  aiSummary: FeedbackAiSummary | null;
  feedbackDate: string;
  employeeName?: string;
  employeeTitle?: string;
}

export interface CreateMeetingInput {
  meetingDate: string;
  meetingType: MeetingType;
  channel: MeetingChannel;
  department: string;
  unit: string;
  team: string;
  employeeCodes: string[];
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  pulse: PulseScores | null;
  pulseNote: string;
  aiSummary: string;
  followups: Array<{ item: string; targetDate: string }>;
  createdBy: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  managerCode: string | null;
}
