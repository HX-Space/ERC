import sanitizeHtml from "sanitize-html";
import { isHtml } from "@/lib/rich-text";

const FONT = /^[\w\s"',-]{1,80}$/;
const SIZE = /^\d{1,2}(\.\d)?(px|pt)$/;
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;

/** Allow only what the outcome editor produces. Plain-text values pass through untouched. */
export function cleanRichText(value: string): string {
  if (!value || !isHtml(value)) return value ?? "";
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "span", "ul", "ol", "li", "label", "input", "div", "blockquote", "h2", "h3"],
    allowedAttributes: {
      ul: ["data-type"],
      li: ["data-type", "data-checked"],
      input: ["type", "checked"],
      span: ["style"],
    },
    allowedStyles: {
      span: { "font-family": [FONT], "font-size": [SIZE], color: [COLOR] },
    },
    exclusiveFilter: (frame) => frame.tag === "input" && frame.attribs.type !== "checkbox",
  });
}
