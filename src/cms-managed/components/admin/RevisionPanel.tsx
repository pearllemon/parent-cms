// Revision history list + restore.
// Reads from public.revisions; restore writes via the provided callback.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Revision } from "@/lib/cpt";

type Props = {
  entityType: string;
  entityId: string;
  onRestore: (snapshot: any) => Promise<void> | void;
};

export default function RevisionPanel({ entityType, entityId, onRestore }: Props) {
  const [revs, setRevs] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("revisions" as any) as any)
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setRevs((data || []) as Revision[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [entityType, entityId]);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2"><History className="w-4 h-4" /> Revisions ({revs.length})</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>Reload</Button>
      </div>
      {revs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No revisions yet — they appear automatically on each save.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-auto">
          {revs.map((r) => (
            <div key={r.id} className="border rounded p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="text-muted-foreground">{r.note || "—"}</div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{r.snapshot?.status || "?"}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                    {openId === r.id ? "Hide" : "View"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!confirm("Restore this revision?")) return;
                    await onRestore(r.snapshot);
                    toast.success("Restored");
                  }}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restore
                  </Button>
                </div>
              </div>
              {openId === r.id && (
                <pre className="bg-muted/40 p-2 rounded overflow-auto max-h-64 text-[11px]">
                  {JSON.stringify(r.snapshot, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
