/**
 * Meeting outcomes are stored as HTML from the rich-text editor (older records are plain text).
 * Analysis (AI, keyword scans) works on plain text, so convert with htmlToText.
 */

export function isHtml(value: string): boolean {
  return /^\s*<(p|ul|ol|h[1-6]|blockquote|div)[\s>]/i.test(value);
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function htmlToText(value: string): string {
  if (!value || !isHtml(value)) return value ?? "";
  return value
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, "\n[x] ")
    .replace(/<li[^>]*data-checked="false"[^>]*>/gi, "\n[ ] ")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|blockquote|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
