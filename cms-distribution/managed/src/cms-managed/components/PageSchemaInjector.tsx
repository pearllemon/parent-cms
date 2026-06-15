// Injects JSON-LD <script> tags for the current page based on
// matching page_schemas entries (enabled only). Matches by exact
// page_url path or the wildcard "*".

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageSchemaInjector() {
  const { pathname } = useLocation();
  const [schemas, setSchemas] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (supabase.from("page_schemas" as any) as any)
      .select("schema_json,page_url")
      .eq("enabled", true)
      .in("page_url", [pathname, "*"])
      .then(({ data }: any) => {
        if (cancelled) return;
        setSchemas((data || []).map((r: any) => r.schema_json));
      });
    return () => { cancelled = true; };
  }, [pathname]);

  if (!schemas.length) return null;
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
}
