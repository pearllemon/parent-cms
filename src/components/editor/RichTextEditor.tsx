// TipTap-based WYSIWYG used by the post/page editor.
// Toolbar mirrors the common WordPress block-editor controls:
// headings, bold/italic/underline/strike, lists, link, image, align,
// blockquote, code, undo/redo. Emits HTML via onChange.

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Image as ImageIcon, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, Minus,
} from "lucide-react";
import LinkPickerDialog from "./LinkPickerDialog";
import ImageAttrsDialog, { type ImageAttrs } from "./ImageAttrsDialog";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onPickImage?: () => Promise<string | null>;
};

const Btn = ({
  active, onClick, title, children, disabled,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-1.5 rounded hover:bg-muted transition-colors ${
      active ? "bg-muted text-foreground" : "text-muted-foreground"
    } disabled:opacity-40`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange, placeholder, onPickImage }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgInitial, setImgInitial] = useState<Partial<ImageAttrs>>({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      ImageExt.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: { default: null, parseHTML: (e) => (e as HTMLElement).style.width || (e as HTMLElement).getAttribute("width"), renderHTML: (a: any) => (a.width ? { style: `width:${a.width}` } : {}) },
            "data-align": { default: "center", parseHTML: (e) => (e as HTMLElement).getAttribute("data-align") || "center", renderHTML: (a: any) => ({ "data-align": a["data-align"] || "center" }) },
            title: { default: null },
          };
        },
      }),
      Placeholder.configure({ placeholder: placeholder || "Start writing your content…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] p-6 focus:outline-none dark:prose-invert [&_img[data-align=left]]:float-left [&_img[data-align=left]]:mr-4 [&_img[data-align=right]]:float-right [&_img[data-align=right]]:ml-4 [&_img[data-align=center]]:mx-auto [&_img[data-align=center]]:block",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && (value || "") !== "") {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) return null;

  const openLink = () => setLinkOpen(true);
  const applyLink = (href: string, target: string | null) => {
    const chain = editor.chain().focus().extendMarkRange("link");
    (target ? chain.setLink({ href, target }) : chain.setLink({ href })).run();
  };
  const removeLink = () => editor.chain().focus().extendMarkRange("link").unsetLink().run();

  const openImage = () => {
    if (editor.isActive("image")) {
      const a = editor.getAttributes("image");
      setImgInitial({ src: a.src, alt: a.alt, title: a.title, width: a.width, align: a["data-align"] });
    } else setImgInitial({});
    setImgOpen(true);
  };
  const applyImage = (a: ImageAttrs) => {
    const attrs: any = { src: a.src, alt: a.alt || null, title: a.title || null, width: a.width || null, "data-align": a.align || "center" };
    if (editor.isActive("image")) editor.chain().focus().updateAttributes("image", attrs).run();
    else editor.chain().focus().setImage(attrs).run();
  };

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30 sticky top-0 z-10">
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-4 h-4" /></Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-4 h-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="H1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></Btn>
        <Btn title="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></Btn>
        <Btn title="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></Btn>
        <Btn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></Btn>
        <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Btn>
        <Btn title="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Btn>
        <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></Btn>
        <Btn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className="w-4 h-4" /></Btn>
        <Btn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="w-4 h-4" /></Btn>
        <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="w-4 h-4" /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="w-4 h-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn title="Link" active={editor.isActive("link")} onClick={openLink}><LinkIcon className="w-4 h-4" /></Btn>
        <Btn title="Image" active={editor.isActive("image")} onClick={openImage}><ImageIcon className="w-4 h-4" /></Btn>
      </div>
      <EditorContent editor={editor} />

      <LinkPickerDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        initialHref={editor.getAttributes("link").href || ""}
        initialTarget={editor.getAttributes("link").target || ""}
        onApply={applyLink}
        onRemove={removeLink}
      />
      <ImageAttrsDialog
        open={imgOpen}
        onOpenChange={setImgOpen}
        initial={imgInitial}
        onApply={applyImage}
        onPickFromLibrary={onPickImage}
      />
    </div>
  );
}
