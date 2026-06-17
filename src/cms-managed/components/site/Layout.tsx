import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ThemeBlocksRenderer from "./ThemeBlocksRenderer";
import { resolveTemplate } from "@/lib/templateAssignments";
import type { ThemeTemplate } from "@/lib/themeStore";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const [headerTpl, setHeaderTpl] = useState<ThemeTemplate | null>(null);
  const [footerTpl, setFooterTpl] = useState<ThemeTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      resolveTemplate({ kind: "header", route: pathname }),
      resolveTemplate({ kind: "footer", route: pathname }),
    ]).then(([h, f]) => {
      if (cancelled) return;
      setHeaderTpl(h);
      setFooterTpl(f);
    }).catch(() => { /* fall back to defaults */ });
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <div className="site-theme-root flex min-h-screen flex-col bg-background">
      {headerTpl ? <ThemeBlocksRenderer blocks={headerTpl.blocks} /> : <Header />}
      <main className="flex-1">{children}</main>
      {footerTpl ? <ThemeBlocksRenderer blocks={footerTpl.blocks} /> : <Footer />}
    </div>
  );
};

export default Layout;
