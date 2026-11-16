"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/format";
import { isHtml } from "@/lib/rich-text";
import { useLang } from "@/components/i18n/lang";

const FONTS = [
  { label: "Default font", value: "" },
  { label: "Calibri", value: "Calibri, Carlito, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: '"Courier New", monospace' },
];
const SIZES = ["", "12px", "14px", "16px", "18px", "20px", "24px"];

export interface RichTextLabels {
  font: string;
  size: string;
  defaultFont: string;
  defaultSize: string;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  bullets: string;
  numbers: string;
  checklist: string;
  undo: string;
  redo: string;
}

export const RICH_TEXT_LABELS_EN: RichTextLabels = {
  font: "Font",
  size: "Size",
  defaultFont: "Default font",
  defaultSize: "Size",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  bullets: "Bulleted list",
  numbers: "Numbered list",
  checklist: "Checklist",
  undo: "Undo",
  redo: "Redo",
};

export const RICH_TEXT_LABELS_AR: RichTextLabels = {
  font: "الخط",
  size: "الحجم",
  defaultFont: "الخط الافتراضي",
  defaultSize: "الحجم",
  bold: "عريض",
  italic: "مائل",
  underline: "تسطير",
  strike: "يتوسطه خط",
  bullets: "قائمة نقطية",
  numbers: "قائمة مرقّمة",
  checklist: "قائمة تحقق",
  undo: "تراجع",
  redo: "إعادة",
};

/** Word-style editor for meeting outcomes. Emits HTML, or "" when empty. */
export function RichTextEditor({
  value,
  onChange,
  label,
  labels: labelsProp,
  minHeight = 132,
}: {
  value: string;
  onChange: (html: string) => void;
  label: string;
  labels?: RichTextLabels;
  minHeight?: number;
}) {
  const lang = useLang();
  const labels = labelsProp ?? (lang === "ar" ? RICH_TEXT_LABELS_AR : RICH_TEXT_LABELS_EN);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, link: false, horizontalRule: false }),
      TextStyle,
      FontFamily,
      FontSize,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        "aria-label": label,
        dir: "auto",
        class: "rich-text min-w-0 px-3 py-2 outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line-2 bg-surface focus-within:border-accent">
      {editor ? <Toolbar editor={editor} labels={labels} /> : <div className="h-[37px] border-b border-line bg-surface-2" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, labels }: { editor: Editor; labels: RichTextLabels }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      font: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  return (
    <div role="toolbar" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-1.5 py-1">
      <select
        aria-label={labels.font}
        value={s.font}
        onChange={(e) => (e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run())}
        className="h-7 max-w-[9.5rem] rounded-[5px] border border-line-2 bg-surface px-1.5 text-[12px] outline-none"
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.value ? f.label : labels.defaultFont}
          </option>
        ))}
      </select>
      <select
        aria-label={labels.size}
        value={s.size}
        onChange={(e) => (e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run())}
        className="h-7 rounded-[5px] border border-line-2 bg-surface px-1.5 text-[12px] outline-none"
      >
        {SIZES.map((v) => (
          <option key={v} value={v}>
            {v ? v.replace("px", "") : labels.defaultSize}
          </option>
        ))}
      </select>
      <Sep />
      <Tool label={labels.bold} active={s.bold} onClick={() => c().toggleBold().run()} icon={Bold} />
      <Tool label={labels.italic} active={s.italic} onClick={() => c().toggleItalic().run()} icon={Italic} />
      <Tool label={labels.underline} active={s.underline} onClick={() => c().toggleUnderline().run()} icon={Underline} />
      <Tool label={labels.strike} active={s.strike} onClick={() => c().toggleStrike().run()} icon={Strikethrough} />
      <Sep />
      <Tool label={labels.bullets} active={s.bullet} onClick={() => c().toggleBulletList().run()} icon={List} />
      <Tool label={labels.numbers} active={s.ordered} onClick={() => c().toggleOrderedList().run()} icon={ListOrdered} />
      <Tool label={labels.checklist} active={s.task} onClick={() => c().toggleTaskList().run()} icon={ListChecks} />
      <Sep />
      <Tool label={labels.undo} disabled={!s.canUndo} onClick={() => c().undo().run()} icon={Undo2} />
      <Tool label={labels.redo} disabled={!s.canRedo} onClick={() => c().redo().run()} icon={Redo2} />
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="mx-1 h-4 w-px bg-line-2" />;
}

function Tool({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Bold;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-7 cursor-pointer place-items-center rounded-[5px] text-muted outline-none hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-2)]",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
    </button>
  );
}

/** Read-only display. HTML is sanitised server-side when read; plain text keeps its line breaks. */
export function RichTextView({ value, className }: { value: string; className?: string }) {
  if (isHtml(value)) {
    return <div dir="auto" className={cn("rich-text rich-text-view", className)} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return (
    <div dir="auto" className={cn("whitespace-pre-wrap", className)}>
      {value}
    </div>
  );
}
