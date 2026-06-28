import React from "react";
import DOMPurify from 'dompurify';

function HtmlEmbedSection({ branding, html }: { branding: any; html: string }) {
  return (
    <section className="py-12 px-6 bg-slate-50 border-t border-slate-100 shrink-0">
      <div className="max-w-4xl mx-auto">
        {/* Render raw HTML embed code */}
        <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
      </div>
    </section>
  );
}

export default HtmlEmbedSection;
