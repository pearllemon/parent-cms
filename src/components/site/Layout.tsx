import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ElementorRenderer from "@/components/elementor/ElementorRenderer";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [headerTree, setHeaderTree] = useState<any[] | null>(null);
  const [footerTree, setFooterTree] = useState<any[] | null>(null);

  useEffect(() => {
    // 1. Fetch header/footer from database
    supabase.from("elementor_templates").select("data").eq("kind", "header").maybeSingle().then(({ data }) => {
      if (data && Array.isArray(data.data)) setHeaderTree(data.data);
    });
    supabase.from("elementor_templates").select("data").eq("kind", "footer").maybeSingle().then(({ data }) => {
      if (data && Array.isArray(data.data)) setFooterTree(data.data);
    });

    // 2. Inject Crisp Script
    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = "32a3672e-4f32-49ce-868e-df3a5a0a7c21";
    (function () {
      const d = document;
      const s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      d.getElementsByTagName("head")[0].appendChild(s);
    })();
  }, []);

  const whatsappUrl = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    ? "https://api.whatsapp.com/send?phone=447403423563&text="
    : "https://web.whatsapp.com/send?phone=447403423563&text=";

  return (
    <div className="site-theme-root flex min-h-screen flex-col bg-background text-foreground font-sans relative">
      {headerTree && <ElementorRenderer data={headerTree} />}
      <main className="flex-1 shrink-0">{children}</main>
      {footerTree && <ElementorRenderer data={footerTree} />}

      {/* Floating WhatsApp chat icon in the bottom corner */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:bg-[#20ba5a] transition-all hover:scale-110 active:scale-95 duration-200"
        aria-label="Chat on WhatsApp"
        id="whatsapp-chat-button"
      >
        <svg
          className="w-8 h-8 text-white fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.417 9.86-9.858.002-2.636-1.023-5.115-2.887-6.979C16.578 1.944 14.1 1.92 11.464 1.92c-5.44 0-9.863 4.42-9.865 9.862 0 1.636.43 3.23 1.248 4.636L1.83 20.89l4.817-1.736zm10.744-7.405c-.29-.145-1.716-.848-1.98-.942-.266-.096-.459-.145-.653.146-.194.29-.75.942-.919 1.134-.168.193-.337.217-.627.072-1.29-.647-2.133-1.07-2.985-2.53-.225-.387.225-.359.643-1.192.072-.145.036-.271-.018-.38-.054-.109-.459-1.106-.628-1.516-.166-.398-.363-.343-.498-.35-.13-.007-.279-.008-.428-.008-.15 0-.393.056-.599.28-.206.225-.785.767-.785 1.87 0 1.102.8 2.167.912 2.314.113.147 1.574 2.404 3.814 3.374.533.23 1.02.38 1.368.49.536.17.1.144.385.102.318-.047 1.716-.702 1.96-1.38.24-.678.24-1.26.168-1.38-.072-.12-.266-.194-.556-.339z" />
        </svg>
      </a>
    </div>
  );
}
