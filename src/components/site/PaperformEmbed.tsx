import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Paperform?: {
      init: () => void;
    };
  }
}

const PAPERFORM_SCRIPT_SRC = "https://paperform.co/__embed.min.js";

function loadPaperformScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PAPERFORM_SCRIPT_SRC}"]`
    );
    if (existing) {
      if (window.Paperform) {
        try {
          window.Paperform.init();
        } catch {
          // ignore
        }
      }
      return resolve();
    }

    const script = document.createElement("script");
    script.src = PAPERFORM_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Paperform) {
        try {
          window.Paperform.init();
        } catch {
          // ignore
        }
      }
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Paperform embed script"));
    document.body.appendChild(script);
  });
}

interface PaperformEmbedProps {
  formId: string;
  className?: string;
}

export function PaperformEmbed({ formId, className = "" }: PaperformEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPaperformScript()
      .then(() => {
        if (cancelled) return;
        setLoaded(true);
        if (window.Paperform) {
          try {
            window.Paperform.init();
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load form");
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  return (
    <div className={`paperform-wrapper relative w-full min-h-[500px] ${className}`}>
      {!loaded && !error && (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="size-10 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading form...</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
          <p>Unable to load the form automatically.</p>
          <a
            href={`https://${formId}.paperform.co`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-semibold underline"
          >
            Click here to open the form directly
          </a>
        </div>
      )}
      <div
        ref={containerRef}
        data-paperform-id={formId}
        className="w-full"
      />
    </div>
  );
}

export default PaperformEmbed;
