// Unified Sync section — merges "Parent Sync" (connection audit) and
// "Sync Control" (selective sync, queue, events, conflicts) into one page.

import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Cloud, SlidersHorizontal } from "lucide-react";
import AdminSync from "./AdminSync";
import AdminSyncControl from "./AdminSyncControl";

export default function AdminSyncHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "control" ? "control" : "parent";

  const onTab = (v: string) => {
    setParams((p) => { p.set("tab", v); return p; }, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Sync</h1>
        <p className="text-sm text-muted-foreground">
          Parent connection health, selective sync, inbound queue and conflicts — all in one place.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTab}>
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="parent" className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" /> <span className="text-xs">Parent Sync</span>
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> <span className="text-xs">Sync Control</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="parent" className="pt-4"><AdminSync /></TabsContent>
        <TabsContent value="control" className="pt-4"><AdminSyncControl /></TabsContent>
      </Tabs>
    </div>
  );
}
