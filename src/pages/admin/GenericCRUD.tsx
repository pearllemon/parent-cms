import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { useSiteConfig } from "@/providers/SiteProvider";

const HIDE = new Set(["created_at", "updated_at", "config_id"]);

const GenericCRUD = () => {
  const { table = "" } = useParams();
  const { config } = useSiteConfig();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from(table)
      .select("*")
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setRows([]);
          setLoading(false);
          return;
        }
        const filtered = (data || []).filter((r: Record<string, unknown>) => {
          if (!("site_id" in r)) return true;
          const sid = r.site_id;
          return !sid || sid === config?.site?.id || (r as { is_global?: boolean }).is_global;
        });
        setRows(filtered);
        if (filtered[0]) {
          setCols(Object.keys(filtered[0]).filter((k) => !HIDE.has(k) && k !== "id" && k !== "site_id").slice(0, 8));
        } else {
          setCols([]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [table, config?.site?.id]);

  const label = table
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl">{label}</h1>
        <p className="text-xs text-muted-foreground">
          Auto-synced from parent • <code className="font-mono">{table}</code> • {rows.length} items
        </p>
      </header>

      <div className="bg-background border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {cols.map((c) => (
                <th key={c} className="p-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={cols.length || 1} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={cols.length || 1} className="p-6 text-center text-muted-foreground">
                  No items. Manage via parent dashboard.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={(r.id as string) || i} className="border-t align-top">
                {cols.map((c) => {
                  const v = r[c];
                  let display: string;
                  if (typeof v === "boolean") display = v ? "✓" : "—";
                  else if (v && typeof v === "object") display = JSON.stringify(v).slice(0, 80);
                  else display = String(v ?? "").slice(0, 120);
                  return (
                    <td key={c} className="p-3 max-w-xs truncate">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GenericCRUD;
