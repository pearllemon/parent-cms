// Real Child Setup Wizard — generates a production-ready bootstrap snippet.
// The child gets:
//   1. src/cms-bootstrap.ts (calls the REAL bootstrapCmsCore from cms-core/)
//   2. src/main.tsx import line
//   3. .env.local entries to mark the project as child mode
//
// The child does NOT need to supply a site_id — it's auto-generated and
// persisted on first boot. Registration, heartbeat, migrations, and SDK
// loading all happen automatically.

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const PARENT_RELEASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-release`;

export default function AdminSetupWizard() {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const envSnippet = useMemo(() => `# .env.local — mark this project as a child of the parent CMS
VITE_CMS_MODE=child
VITE_PARENT_RELEASE_URL=${PARENT_RELEASE_URL}
`, []);

  const bootstrap = useMemo(() => `// src/cms-bootstrap.ts — production bootstrap.
// Real implementation. Do not edit by hand.
import { bootstrapCmsCore } from "@/cms-core/bootstrap";
import { supabase } from "@/integrations/supabase/client";

export const cmsCorePromise = bootstrapCmsCore({
  parentReleaseUrl: import.meta.env.VITE_PARENT_RELEASE_URL,
  siteName: ${JSON.stringify(siteName || null)},
  siteUrl: ${JSON.stringify(siteUrl || null)},
  mode: "child",

  // Apply parent-shipped migrations against THIS child's own Cloud DB.
  runMigration: async (step) => {
    if (step.kind === "sql") {
      // Execute via a child-owned RPC that wraps the SQL safely.
      // The 'exec_cms_migration' function should be installed in the child DB
      // and restricted to service_role / migration runner.
      const { error } = await supabase.rpc("exec_cms_migration", {
        version: step.version,
        payload: step.payload,
      });
      if (error) throw error;
    }
    // 'js' steps are evaluated at engine load (see SDK module).
  },
});

cmsCorePromise.then((r) => {
  // eslint-disable-next-line no-console
  console.info("[cms-core] booted", { site: r.siteId, version: r.version, sdk: r.sdkLoaded });
});
`, [siteName, siteUrl]);

  const mainSnippet = `// src/main.tsx — import the bootstrap BEFORE rendering the app.
import "./cms-bootstrap";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key); toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-3xl flex items-center gap-2">
          <Wand2 className="w-7 h-7" /> Child setup wizard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generates a real bootstrap that auto-registers this child with the parent CMS, runs migrations, heartbeats every 5 minutes, and dynamically loads new engine versions as releases are cut.
        </p>
      </header>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Display name (optional — used in Installations list)</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Acme Marketing Site" />
          </div>
          <div>
            <Label>Site URL (optional)</Label>
            <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://acme.example.com" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Site ID is auto-generated on first boot and persisted in the child's localStorage. No manual entry required.
        </p>
      </Card>

      <Snippet label="1. .env.local" code={envSnippet} copied={copied === "env"} onCopy={() => copy(envSnippet, "env")} />
      <Snippet label="2. src/cms-bootstrap.ts" code={bootstrap} copied={copied === "bootstrap"} onCopy={() => copy(bootstrap, "bootstrap")} />
      <Snippet label="3. src/main.tsx (add the import)" code={mainSnippet} copied={copied === "main"} onCopy={() => copy(mainSnippet, "main")} />

      <Card className="p-5">
        <h2 className="font-display text-lg mb-2">Next steps in the child project</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Copy <code>src/cms-core/</code> from this parent into the child (one-time scaffold — every future engine update arrives as the SDK bundle).</li>
          <li>Create <code>.env.local</code> and the two files above.</li>
          <li>Reload the child. It auto-registers and appears in <strong>Installations</strong> within seconds.</li>
          <li>Cut a new release in <strong>Releases</strong> — every child upgrades on its next page load (or sooner if you click <em>Force upgrade</em>).</li>
        </ol>
      </Card>
    </div>
  );
}

function Snippet({ label, code, copied, onCopy }: { label: string; code: string; copied: boolean; onCopy: () => void }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <span className="text-sm font-medium">{label}</span>
        <Button size="sm" variant="ghost" onClick={onCopy}>
          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto bg-background"><code>{code}</code></pre>
    </Card>
  );
}
