import { todayIso } from "@/lib/format";
import type { FeedbackAiSummary } from "@/types";

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function has(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export interface MeetingAiAssist {
  summary: string;
  risks: Array<{ t: string }>;
  pos: Array<{ t: string }>;
  fus: Array<{ item: string; target: string }>;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function lowerFirst(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

function clause(s: string) {
  return lowerFirst(s.replace(/[.!?؟]+$/, ""));
}

/**
 * Local engine for the meeting assist. It mirrors the shape and tone of the
 * OpenAI response: a short record-style summary, the risks and positives as
 * written, and follow-ups taken from what the specialist said must happen next.
 */
export function assistMeetingNotes(input: {
  positive: string;
  risk: string;
  negative: string;
  recommendation: string;
  followUpNote: string;
  meetingDate: string;
}): MeetingAiAssist {
  const pos = sentences(input.positive);
  const riskS = sentences(input.risk);
  const negS = sentences(input.negative);
  const recS = sentences(input.recommendation);
  const fuS = sentences(input.followUpNote);

  const risks = [...riskS, ...negS].slice(0, 5).map((t) => ({ t }));
  const positives = pos.slice(0, 5).map((t) => ({ t }));
  const base = input.meetingDate || todayIso();

  // Follow-ups: what the notes say must be revisited first, then the recommendations.
  const actionable = [...fuS, ...recS].filter((t) => t.split(/\s+/).length >= 3);
  const fus = [...new Set(actionable)].slice(0, 3).map((t, i) => ({
    item: t.replace(/[.!?؟]+$/, ""),
    target: addDays(base, i === 0 && negS.length ? 7 : 14),
  }));
  if (!fus.length && risks.length) {
    fus.push({ item: `Check in again on: ${clause(risks[0].t)}`, target: addDays(base, 14) });
  }

  const end = (t: string) => (/[.!?؟]$/.test(t) ? t : `${t}.`);
  // Answer in the language the notes are written in, as the OpenAI prompt asks.
  const allText = [input.positive, input.risk, input.negative, input.recommendation, input.followUpNote].join(" ");
  const arabic = (allText.match(/[؀-ۿ]/g)?.length ?? 0) > allText.replace(/\s/g, "").length / 2;
  const L = arabic
    ? { pos: "إيجابي", risk: "مخاوف", next: "الخطوة التالية", empty: "اكتب ملاحظات الاجتماع أولاً." }
    : { pos: "Positive", risk: "Concerns", next: "Next step", empty: "Add meeting notes first. The assistant only works from what you write." };
  const parts: string[] = [];
  if (pos[0]) parts.push(`${L.pos} — ${[pos[0], pos[1]].filter(Boolean).map((t) => end(t!)).join(" ")}`);
  if (riskS[0] || negS[0]) {
    parts.push(`${L.risk} — ${[riskS[0], negS[0]].filter(Boolean).map((t) => end(t!)).join(" ")}`);
  }
  if (recS[0]) parts.push(`${L.next} — ${end(recS[0])}`);

  return {
    summary: parts.length ? parts.join(" ") : L.empty,
    risks,
    pos: positives,
    fus,
  };
}

// Feedback sections, checked in this order: each sentence lands in exactly one.
const FB_RECOMMEND = ["recommend", "suggest", "should", "next year", "next quarter", "plan", "course", "أنصح", "اقترح", "لازم ياخد", "الخطة"];
const FB_CONCERN = ["late", "mistake", "error", "complain", "conflict", "raised", "rework", "struggl", "concern", "issue", "absent", "بيتأخر", "غلط", "مشكلة", "شكوى"];
const FB_DEVELOP = ["needs to", "need to", "improve", "build", "confidence", "speak up", "learn", "develop", "grow", "training", "محتاج", "يتحسن", "يتعلم", "يتكلم أكتر", "يطور"];
const FB_STRENGTH = ["reliable", "strong", "excellent", "great", "committed", "calm", "always", "helps", "supports", "ownership", "on time", "team player", "ملتزم", "ممتاز", "بيساعد", "في الميعاد", "شاطر"];

/**
 * Local engine for "Organise with AI": sorts each sentence of the manager's
 * feedback into one section, in the order a reviewer would (an action beats a
 * concern, a concern beats a growth area, the rest that praises is a strength).
 */
export function organizeFeedback(text: string): FeedbackAiSummary {
  const out: FeedbackAiSummary = { strengths: [], development: [], concerns: [], recommendations: [] };
  for (const raw of sentences(text)) {
    // "X. Needs to Y" style sentences joined by ";" are split so each half is sorted on its own.
    for (const s of raw.split(/;\s+/).map((x) => x.trim()).filter(Boolean)) {
      if (has(s, FB_RECOMMEND)) out.recommendations.push(s);
      else if (has(s, FB_CONCERN)) out.concerns.push(s);
      else if (has(s, FB_DEVELOP)) out.development.push(s);
      else if (has(s, FB_STRENGTH)) out.strengths.push(s);
    }
  }
  return {
    strengths: out.strengths.slice(0, 4),
    development: out.development.slice(0, 4),
    concerns: out.concerns.slice(0, 4),
    recommendations: out.recommendations.slice(0, 4),
  };
}

export const ANALYTICS_THEMES = [
  {
    label: "Workload & overtime",
    kw: ["workload", "overtime", "stretched", "burn", "tired", "exhaust", "heavy", "pressure", "understaffed", "long hours", "weekend", "ضغط", "وقت إضافي", "مرهق"],
  },
  {
    label: "Pay, commission & reimbursement",
    kw: ["payment", "pay delay", "salary", "commission", "reimburs", "payout", "bonus", "allowance", "underpaid", "المرتب", "الحافز", "العمولة"],
  },
  {
    label: "Tools & equipment",
    kw: ["tablet", "laptop", "crm", "system", "builds", "manual", "freeze", "equipment", "scanner", "software", "headset", "السيستم", "الجهاز", "بيهنج"],
  },
  {
    label: "Unclear rules & communication",
    kw: ["not explained", "without notice", "unclear", "ownership", "approval", "communicat", "informed", "changed the", "confusing", "مش واضح", "من غير ما حد يقول"],
  },
  {
    label: "Manager relationship",
    kw: ["supervisor", "team lead", "manager", "micromanag", "favourit", "favorit", "tone", "shouted", "disrespect", "المشرف", "المدير المباشر بيعامل"],
  },
  {
    label: "Shifts & scheduling",
    kw: ["shift", "roster", "schedule", "rotation", "night", "leave request", "time off", "swap", "الجدول", "الورديات", "إجازة", "لإجازته"],
  },
  {
    label: "Career path & retention",
    kw: ["career", "promotion", "other offers", "look outside", "resign", "leaving", "growth path", "stuck", "الترقية", "يسيب الشغل", "عرض تاني"],
  },
  {
    label: "Health & safety",
    kw: ["safety", "injur", "back pain", "heat", "ventilation", "ergonom", "hazard", "حر", "التهوية", "ضهره"],
  },
];

export const POSITIVE_THEMES = [
  {
    label: "Peer mentoring & coaching",
    kw: ["mentor", "coach", "onboard", "supports", "helps new", "trained", "بيساعد زمايله", "بيدرب"],
  },
  {
    label: "Process improvements",
    kw: ["improved", "reduced", "cut", "checklist", "automat", "faster", "streamlin", "حسّن", "قلل"],
  },
  {
    label: "Customer recognition",
    kw: ["customer", "client", "thank-you", "compliment", "praised", "عميل", "العملاء"],
  },
  {
    label: "Ownership & reliability",
    kw: ["reliable", "led", "go-to", "volunteer", "exceeded", "ownership", "on time", "dependable", "ملتزم", "بيقود", "في الميعاد"],
  },
  {
    label: "Team spirit",
    kw: ["team spirit", "collaborat", "together", "morale", "support each other", "cohesive", "روح الفريق", "بيساعد بعض"],
  },
];

export const THEME_RECS: Record<string, string> = {
  "Workload & overtime":
    "Review staffing and overtime patterns with the affected team leads and agree a cap on consecutive overtime.",
  "Pay, commission & reimbursement":
    "Agree a fixed payment calendar with Finance for overtime, commission and expenses, and communicate it.",
  "Tools & equipment":
    "Log the recurring equipment and system issues with Technology, with an owner and a fix date.",
  "Unclear rules & communication":
    "Publish the relevant rules (targets, commission, approval limits) before changes take effect.",
  "Manager relationship":
    "Hold a facilitated check-in with the managers named and offer them feedback coaching.",
  "Shifts & scheduling":
    "Publish rosters at least two weeks ahead and set a clear shift-swap process.",
  "Career path & retention":
    "Discuss visible next steps with employees who raised career concerns and map internal openings.",
  "Health & safety":
    "Ask the site lead and safety officer to inspect the reported conditions and report back within a week.",
};

export function scanThemes(
  texts: Array<{ id: string; text: string; team: string }>,
  themes: Array<{ label: string; kw: string[] }>,
) {
  return themes
    .map((theme) => {
      const ids: string[] = [];
      const teams: string[] = [];
      texts.forEach((row) => {
        sentences(row.text).forEach((s) => {
          if (has(s, theme.kw)) {
            ids.push(row.id);
            teams.push(row.team);
          }
        });
      });
      return {
        label: theme.label,
        ids: [...new Set(ids)],
        teams: [...new Set(teams)],
      };
    })
    .filter((t) => t.ids.length)
    .sort((a, b) => b.ids.length - a.ids.length);
}
