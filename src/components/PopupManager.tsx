import { useEffect, useState } from "react";
import { useSiteConfig } from "@/providers/SiteProvider";
import { trackPopupEvent } from "@/lib/parent";

type Popup = {
  is_active?: boolean;
  trigger_type?: "timed" | "exit_intent";
  trigger_delay_seconds?: number;
  show_once_per_session?: boolean;
  bg_color?: string;
  text_color?: string;
  accent_color?: string;
  border_radius?: string;
  heading?: string;
  description?: string;
  cta_text?: string;
  cta_link?: string;
  dismiss_text?: string;
};

const PopupManager = () => {
  const { config } = useSiteConfig();
  const pc = config?.popupConfig as (Popup & { id?: string }) | null;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pc?.is_active) return;
    if (pc.show_once_per_session && sessionStorage.getItem("pl_popup_shown")) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY < 0) setShow(true);
    };
    if (pc.trigger_type === "timed") {
      timer = setTimeout(() => setShow(true), (pc.trigger_delay_seconds ?? 5) * 1000);
    } else if (pc.trigger_type === "exit_intent") {
      document.addEventListener("mouseleave", onLeave);
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [pc]);

  if (!show || !pc) return null;
  const bg = pc.bg_color ? `hsl(${pc.bg_color})` : "white";
  const text = pc.text_color ? `hsl(${pc.text_color})` : "black";
  const accent = pc.accent_color ? `hsl(${pc.accent_color})` : "hsl(var(--primary))";

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("pl_popup_shown", "1");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        style={{ background: bg, color: text, borderRadius: pc.border_radius ?? "1rem" }}
        className="max-w-md w-full p-8 relative shadow-2xl"
      >
        {pc.heading && <h2 className="text-2xl font-bold mb-2">{pc.heading}</h2>}
        {pc.description && <p className="opacity-90 mb-4">{pc.description}</p>}
        {pc.cta_text && (
          <a
            href={pc.cta_link || "#"}
            style={{ background: accent }}
            className="inline-block px-6 py-2 rounded-full font-bold text-white"
          >
            {pc.cta_text}
          </a>
        )}
        <button onClick={dismiss} className="block mt-4 text-sm opacity-60 hover:opacity-100">
          {pc.dismiss_text || "No thanks"}
        </button>
      </div>
    </div>
  );
};

export default PopupManager;
