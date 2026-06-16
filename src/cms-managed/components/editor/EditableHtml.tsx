// Editable contenteditable wrapper for non-Elementor (plain HTML) pages.
// Tracks innerHTML changes and surfaces them to the parent via onChange.
import { useEffect, useRef } from "react";

export default function EditableHtml({
  html,
  onChange,
}: {
  html: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="prose prose-lg prose-neutral max-w-none prose-headings:font-display prose-a:text-primary prose-img:rounded-xl focus:outline-2 focus:outline-blue-500 focus:outline-offset-4 rounded"
      onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
    />
  );
}
