// WordPress-style Screen Options: column visibility, items-per-page, view mode.
// Persists per-table preferences to localStorage and (best-effort) to
// public.user_table_prefs so they follow the user.

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ColumnDef = { key: string; label: string; defaultVisible?: boolean; alwaysOn?: boolean };

export type ScreenPrefs = {
  visible: Record<string, boolean>;
  perPage: number;
  view: "compact" | "extended";
};

export function useScreenPrefs(storageKey: string, columns: ColumnDef[]): [ScreenPrefs, (p: Partial<ScreenPrefs>) => void] {
  const defaults: ScreenPrefs = useMemo(() => ({
    visible: Object.fromEntries(columns.map((c) => [c.key, c.defaultVisible !== false])),
    perPage: 20,
    view: "extended",
  }), [columns]);

  const [prefs, setPrefs] = useState<ScreenPrefs>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`screenPrefs:${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({ ...defaults, ...parsed, visible: { ...defaults.visible, ...(parsed.visible || {}) } });
      }
    } catch { /* ignore */ }
    // server fallback
    (supabase.from("user_table_prefs" as any) as any).select("prefs").eq("key", storageKey).maybeSingle().then(({ data }: any) => {
      if (data?.prefs) {
        setPrefs((cur) => ({ ...cur, ...data.prefs, visible: { ...cur.visible, ...(data.prefs.visible || {}) } }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const update = (patch: Partial<ScreenPrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch, visible: { ...cur.visible, ...(patch.visible || {}) } };
      try { localStorage.setItem(`screenPrefs:${storageKey}`, JSON.stringify(next)); } catch { /* ignore */ }
      (supabase.from("user_table_prefs" as any) as any).upsert({ key: storageKey, prefs: next, updated_at: new Date().toISOString() }, { onConflict: "key" }).then(() => {});
      return next;
    });
  };

  return [prefs, update];
}

export default function ScreenOptions({
  columns, prefs, onChange,
}: {
  columns: ColumnDef[];
  prefs: ScreenPrefs;
  onChange: (p: Partial<ScreenPrefs>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-2" /> Screen Options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-4" align="end">
        <div>
          <Label className="text-xs font-semibold uppercase">Columns</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {columns.map((c) => (
              <label key={c.key} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1">
                <span className="truncate">{c.label}</span>
                <Switch
                  checked={prefs.visible[c.key] !== false}
                  disabled={c.alwaysOn}
                  onCheckedChange={(v) => onChange({ visible: { [c.key]: v } })}
                />
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase">Pagination</Label>
          <Select value={String(prefs.perPage)} onValueChange={(v) => onChange({ perPage: Number(v) })}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} per page</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase">View mode</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["compact", "extended"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onChange({ view: m })}
                className={`text-sm border rounded px-3 py-1.5 capitalize ${prefs.view === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >{m}</button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
