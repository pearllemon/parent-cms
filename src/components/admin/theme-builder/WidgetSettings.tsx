import { useState, useEffect } from "react";
import { supabase } from "@/lib/parent";
import { MessageSquare, Plus, Trash2, Phone, Globe, Link2, Copy, Check, Mail, ExternalLink, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WidgetSettings = () => {
  const [whatsappConfigs, setWhatsappConfigs] = useState<any[]>([]);
  const [crispConfigs, setCrispConfigs] = useState<any[]>([]);
  const [ycbmConfigs, setYcbmConfigs] = useState<any[]>([]);
  const [webhookConfigs, setWebhookConfigs] = useState<any[]>([]);
  const [gmailConfigs, setGmailConfigs] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [waAssignments, setWaAssignments] = useState<any[]>([]);
  const [crispAssignments, setCrispAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState("");
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [ycbmStatus, setYcbmStatus] = useState<any>(null);
  const [ycbmSyncing, setYcbmSyncing] = useState(false);
  const [ycbmLastResult, setYcbmLastResult] = useState<any>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `${supabaseUrl}/functions/v1/lead-webhook`;
  const gmailSyncUrl = `${supabaseUrl}/functions/v1/gmail-sync`;
  const ycbmSyncUrl = `${supabaseUrl}/functions/v1/ycbm-sync`;

  const fetchAll = async () => {
    const [wa, cr, yc, wh, gm, s, waA, crA] = await Promise.all([
      supabase.from("whatsapp_configs").select("*").order("created_at"),
      supabase.from("crisp_configs").select("*").order("created_at"),
      supabase.from("ycbm_configs").select("*").order("created_at"),
      supabase.from("webhook_configs").select("*").order("created_at"),
      supabase.from("gmail_configs").select("*").order("created_at"),
      supabase.from("sites").select("id, name").order("name"),
      supabase.from("site_whatsapp_assignments").select("*"),
      supabase.from("site_crisp_assignments").select("*"),
    ]);
    setWhatsappConfigs(wa.data || []);
    setCrispConfigs(cr.data || []);
    setYcbmConfigs(yc.data || []);
    setWebhookConfigs(wh.data || []);
    setGmailConfigs(gm.data || []);
    setSites(s.data || []);
    setWaAssignments(waA.data || []);
    setCrispAssignments(crA.data || []);
    setLoading(false);
  };

  const checkGmailStatus = async () => {
    try {
      const res = await fetch(`${gmailSyncUrl}?action=status`);
      const data = await res.json();
      setGmailStatus(data);
    } catch { setGmailStatus(null); }
  };

  const checkYcbmStatus = async () => {
    try {
      const res = await fetch(`${ycbmSyncUrl}?action=status`);
      const data = await res.json();
      setYcbmStatus(data);
    } catch { setYcbmStatus(null); }
  };

  const syncYcbm = async () => {
    setYcbmSyncing(true);
    try {
      const res = await fetch(`${ycbmSyncUrl}?action=sync`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Sync failed");
      setYcbmLastResult(data);
      toast.success(`Synced ${data.totalBookings || 0} bookings · ${data.newLeads || 0} new leads`);
      checkYcbmStatus();
    } catch (e: any) {
      toast.error(e.message || "YCBM sync failed");
    } finally {
      setYcbmSyncing(false);
    }
  };

  useEffect(() => { fetchAll(); checkGmailStatus(); checkYcbmStatus(); }, []);

  // ─── WhatsApp CRUD ───
  const addWhatsapp = async () => {
    const { error } = await supabase.from("whatsapp_configs").insert({ name: "New WhatsApp", phone_number: "", is_default: whatsappConfigs.length === 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("WhatsApp config added");
    fetchAll();
  };

  const updateWhatsapp = async (id: string, updates: any) => {
    await supabase.from("whatsapp_configs").update(updates).eq("id", id);
    fetchAll();
  };

  const deleteWhatsapp = async (id: string) => {
    await supabase.from("whatsapp_configs").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  // ─── Crisp CRUD ───
  const addCrisp = async () => {
    const { error } = await supabase.from("crisp_configs").insert({ name: "Default Crisp", website_id: "32a3672e-4f32-49ce-868e-df3a5a0a7c21", is_default: crispConfigs.length === 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("Crisp config added");
    fetchAll();
  };

  const updateCrisp = async (id: string, updates: any) => {
    await supabase.from("crisp_configs").update(updates).eq("id", id);
    fetchAll();
  };

  const deleteCrisp = async (id: string) => {
    await supabase.from("crisp_configs").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  // ─── YCBM CRUD ───
  const addYcbm = async () => {
    const { error } = await supabase.from("ycbm_configs").insert({ name: "New Calendar", is_default: ycbmConfigs.length === 0 });
    if (error) { toast.error(error.message); return; }
    toast.success("YCBM config added");
    fetchAll();
  };

  const updateYcbm = async (id: string, updates: any) => {
    await supabase.from("ycbm_configs").update(updates).eq("id", id);
    fetchAll();
  };

  const deleteYcbm = async (id: string) => {
    await supabase.from("ycbm_configs").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  // ─── Gmail CRUD ───
  const addGmail = async () => {
    const { error } = await supabase.from("gmail_configs").insert({ name: "Google Workspace" });
    if (error) { toast.error(error.message); return; }
    toast.success("Gmail config added");
    fetchAll();
  };

  const updateGmail = async (id: string, updates: any) => {
    await supabase.from("gmail_configs").update(updates).eq("id", id);
    fetchAll();
  };

  const deleteGmail = async (id: string) => {
    await supabase.from("gmail_configs").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  const syncGmail = async () => {
    setGmailSyncing(true);
    try {
      const res = await fetch(`${gmailSyncUrl}?action=sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) { toast.error(data.error); } else {
        toast.success(`Synced ${data.synced} new leads from ${data.total_checked} emails`);
        fetchAll();
      }
    } catch (e: any) { toast.error(e.message); }
    setGmailSyncing(false);
  };

  // ─── Webhook CRUD ───
  const addWebhook = async (service: string) => {
    const { error } = await supabase.from("webhook_configs").insert({ service, webhook_secret: crypto.randomUUID().replace(/-/g, "").slice(0, 24) });
    if (error) { toast.error(error.message); return; }
    toast.success(`${service} webhook added`);
    fetchAll();
  };

  const updateWebhook = async (id: string, updates: any) => {
    await supabase.from("webhook_configs").update(updates).eq("id", id);
    fetchAll();
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(label);
    setTimeout(() => setCopiedWebhook(""), 2000);
    toast.success("Copied!");
  };

  if (loading) return <p className="text-center py-12 text-sm text-muted-foreground">Loading...</p>;

  const crispEventsList = [
    "message:send", "message:received", "message:updated", "message:removed",
    "message:acknowledge:read:send", "message:acknowledge:read:received",
    "message:notify:unread:send", "message:notify:unread:received",
    "session:set_state", "session:set_email", "session:set_phone", "session:set_data",
    "session:set_segments", "session:set_nickname", "session:set_avatar",
    "session:sync:geolocation", "session:sync:system", "session:sync:network",
    "session:sync:timezone", "session:sync:rating",
    "people:profile:created", "people:profile:updated", "people:bind:session",
    "campaign:progress", "campaign:dispatched", "campaign:running",
    "email:subscribe", "email:track:view", "plugin:event", "status:health:changed",
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="bg-muted p-1 flex-wrap h-auto">
          <TabsTrigger value="whatsapp" className="text-xs"><Phone className="w-3 h-3 mr-1" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="crisp" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" /> Crisp</TabsTrigger>
          <TabsTrigger value="ycbm" className="text-xs"><Globe className="w-3 h-3 mr-1" /> YouCanBook.me</TabsTrigger>
          <TabsTrigger value="gmail" className="text-xs"><Mail className="w-3 h-3 mr-1" /> Gmail</TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs"><Link2 className="w-3 h-3 mr-1" /> Webhooks</TabsTrigger>
        </TabsList>

        {/* ═══ WhatsApp ═══ */}
        <TabsContent value="whatsapp" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">WhatsApp Widget Numbers</h3>
              <p className="text-xs text-muted-foreground">Configure WhatsApp numbers for the chat widget. Default applies globally, or assign per-site.</p>
            </div>
            <Button variant="pearl" size="sm" onClick={addWhatsapp}><Plus className="w-3 h-3 mr-1" /> Add Number</Button>
          </div>
          {whatsappConfigs.map(wa => (
            <div key={wa.id} className="pearl-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name</label>
                  <input defaultValue={wa.name} onBlur={(e) => updateWhatsapp(wa.id, { name: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Country Code</label>
                  <input defaultValue={wa.country_code} onBlur={(e) => updateWhatsapp(wa.id, { country_code: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="+44" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Phone Number</label>
                  <input defaultValue={wa.phone_number} onBlur={(e) => updateWhatsapp(wa.id, { phone_number: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={wa.is_default} onChange={(e) => updateWhatsapp(wa.id, { is_default: e.target.checked })} className="rounded" />
                    Default (Global)
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 hover:text-destructive ml-auto" onClick={() => deleteWhatsapp(wa.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Welcome Message</label>
                <input defaultValue={wa.welcome_message} onBlur={(e) => updateWhatsapp(wa.id, { welcome_message: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
              </div>
              <div className="text-[10px] text-muted-foreground">
                Assigned to: {waAssignments.filter(a => a.whatsapp_config_id === wa.id).map(a => sites.find(s => s.id === a.site_id)?.name).filter(Boolean).join(", ") || (wa.is_default ? "All sites (default)" : "None")}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ═══ Crisp ═══ */}
        <TabsContent value="crisp" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Crisp Chat Widget</h3>
              <p className="text-xs text-muted-foreground">Manage Crisp website IDs. The embed script is auto-injected into child sites.</p>
            </div>
            <Button variant="pearl" size="sm" onClick={addCrisp}><Plus className="w-3 h-3 mr-1" /> Add Config</Button>
          </div>
          {crispConfigs.map(cr => (
            <div key={cr.id} className="pearl-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name</label>
                  <input defaultValue={cr.name} onBlur={(e) => updateCrisp(cr.id, { name: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Crisp Website ID</label>
                  <input defaultValue={cr.website_id} onBlur={(e) => updateCrisp(cr.id, { website_id: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono text-xs" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={cr.is_default} onChange={(e) => updateCrisp(cr.id, { is_default: e.target.checked })} className="rounded" />
                    Default (Global)
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 hover:text-destructive ml-auto" onClick={() => deleteCrisp(cr.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Auto-generated embed code (injected into child sites):</p>
                <code className="text-[10px] text-foreground break-all">{`<script>window.$crisp=[];window.CRISP_WEBSITE_ID="${cr.website_id}";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>`}</code>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ═══ YCBM ═══ */}
        <TabsContent value="ycbm" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold">YouCanBook.me Calendars</h3>
              <p className="text-xs text-muted-foreground">Live API sync pulls bookings into Lead Management automatically.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={syncYcbm} disabled={ycbmSyncing || !ycbmStatus?.connected}>
                <RefreshCw className={`w-3 h-3 mr-1 ${ycbmSyncing ? "animate-spin" : ""}`} /> {ycbmSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button variant="pearl" size="sm" onClick={addYcbm}><Plus className="w-3 h-3 mr-1" /> Add Calendar</Button>
            </div>
          </div>

          {/* Status card */}
          <div className="pearl-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">Connection Status</h4>
            </div>
            {ycbmStatus ? (
              ycbmStatus.connected ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="w-3 h-3 text-primary" />
                    <span className="font-medium">Connected</span>
                    {ycbmStatus.accountName && <span className="text-muted-foreground">· {ycbmStatus.accountName}</span>}
                    <span className="text-muted-foreground">· Account {ycbmStatus.accountId}</span>
                  </div>
                  <p className="text-muted-foreground">{ycbmStatus.profilesCount} booking profile(s) found.</p>
                  {Array.isArray(ycbmStatus.profiles) && ycbmStatus.profiles.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {ycbmStatus.profiles.map((p: any) => (
                        <div key={p.id} className="rounded-lg border border-border bg-background p-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{p.title || p.subdomain}</p>
                            {p.subdomain && <p className="text-[10px] text-muted-foreground truncate">{p.subdomain}.youcanbook.me</p>}
                          </div>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {ycbmLastResult && (
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                      Last sync: {ycbmLastResult.totalBookings} bookings checked · {ycbmLastResult.newLeads} new leads created.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <p className="text-destructive font-medium">Not connected</p>
                  <p className="text-muted-foreground">{ycbmStatus.reason || "API credentials missing or invalid."}</p>
                  <p className="text-muted-foreground">Add your <code className="text-foreground">YCBM_ACCOUNT_ID</code> and <code className="text-foreground">YCBM_API_KEY</code> in backend secrets.</p>
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Checking connection...</p>
            )}
          </div>

          {ycbmConfigs.map(yc => (
            <div key={yc.id} className="pearl-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name</label>
                  <input defaultValue={yc.name} onBlur={(e) => updateYcbm(yc.id, { name: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Calendar URL</label>
                  <input defaultValue={yc.calendar_url} onBlur={(e) => updateYcbm(yc.id, { calendar_url: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="https://youcanbook.me/..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Embed Code</label>
                <textarea defaultValue={yc.embed_code} onBlur={(e) => updateYcbm(yc.id, { embed_code: e.target.value })} rows={3} className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={yc.is_default} onChange={(e) => updateYcbm(yc.id, { is_default: e.target.checked })} className="rounded" />
                  Default
                </label>
                <Button variant="ghost" size="sm" className="h-7 hover:text-destructive ml-auto" onClick={() => deleteYcbm(yc.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ═══ Gmail / Google Workspace ═══ */}
        <TabsContent value="gmail" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Gmail / Google Workspace</h3>
              <p className="text-xs text-muted-foreground">Connect your Google Workspace to auto-sync incoming emails as leads.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={syncGmail} disabled={gmailSyncing}>
                <RefreshCw className={`w-3 h-3 mr-1 ${gmailSyncing ? "animate-spin" : ""}`} /> {gmailSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button variant="pearl" size="sm" onClick={addGmail}><Plus className="w-3 h-3 mr-1" /> Add Config</Button>
            </div>
          </div>

          {/* Status Card */}
          <div className="pearl-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">Connection Status</h4>
            </div>
            {gmailStatus ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${gmailStatus.has_client_id ? "bg-green-500" : "bg-red-400"}`} />
                  <p className="text-[10px] text-muted-foreground">Client ID</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${gmailStatus.has_client_secret ? "bg-green-500" : "bg-red-400"}`} />
                  <p className="text-[10px] text-muted-foreground">Client Secret</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${gmailStatus.has_refresh_token ? "bg-green-500" : "bg-red-400"}`} />
                  <p className="text-[10px] text-muted-foreground">Refresh Token</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Unable to check Gmail status. Deploy the gmail-sync function first.</p>
            )}

            {gmailStatus && !gmailStatus.configured && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-3">
                <h5 className="text-xs font-semibold text-foreground">Setup Instructions</h5>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
                  <li>
                    <strong>Create Google Cloud Project</strong> — Go to{" "}
                    <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer" className="text-primary underline">
                      Google Cloud Console <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </li>
                  <li>
                    <strong>Enable Gmail API</strong> — In your project, go to{" "}
                    <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer" className="text-primary underline">
                      APIs & Services → Library → Gmail API <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </li>
                  <li>
                    <strong>Configure OAuth Consent Screen</strong> — Go to{" "}
                    <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer" className="text-primary underline">
                      OAuth Consent Screen <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                    <br />
                    <span className="text-muted-foreground">Add scopes: <code className="text-[10px] bg-muted px-1 rounded">gmail.readonly</code> and <code className="text-[10px] bg-muted px-1 rounded">gmail.labels</code></span>
                  </li>
                  <li>
                    <strong>Create OAuth 2.0 Credentials</strong> — Go to{" "}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary underline">
                      Credentials <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                    <br />
                    <span className="text-muted-foreground">Type: Web Application. Add redirect URI:</span>
                    <div className="flex gap-1 mt-1">
                      <input readOnly value={`${supabaseUrl}/functions/v1/gmail-sync?action=oauth_callback`} className="h-7 flex-1 rounded border border-input bg-muted/50 px-2 text-[10px] font-mono" />
                      <Button variant="outline" size="sm" className="h-7" onClick={() => copyText(`${supabaseUrl}/functions/v1/gmail-sync?action=oauth_callback`, "redirect")}>
                        {copiedWebhook === "redirect" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </li>
                  <li>
                    <strong>Add Secrets</strong> — Add these 3 secrets to your project:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><code className="text-[10px] bg-muted px-1 rounded">GMAIL_CLIENT_ID</code> — from Google Cloud credentials</li>
                      <li><code className="text-[10px] bg-muted px-1 rounded">GMAIL_CLIENT_SECRET</code> — from Google Cloud credentials</li>
                      <li><code className="text-[10px] bg-muted px-1 rounded">GMAIL_REFRESH_TOKEN</code> — obtained after OAuth authorization</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Authorize</strong> — After adding Client ID & Secret, visit:
                    <div className="flex gap-1 mt-1">
                      <input readOnly value={`${supabaseUrl}/functions/v1/gmail-sync?action=authorize`} className="h-7 flex-1 rounded border border-input bg-muted/50 px-2 text-[10px] font-mono" />
                      <Button variant="outline" size="sm" className="h-7" onClick={() => window.open(`${supabaseUrl}/functions/v1/gmail-sync?action=authorize`, "_blank")}>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-muted-foreground">This will generate your refresh token.</span>
                  </li>
                </ol>
              </div>
            )}

            {gmailStatus?.configured && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium">✅ Gmail API fully connected! Use "Sync Now" to pull latest emails into leads.</p>
              </div>
            )}
          </div>

          {/* Gmail configs */}
          {gmailConfigs.map(gm => (
            <div key={gm.id} className="pearl-card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name</label>
                  <input defaultValue={gm.name} onBlur={(e) => updateGmail(gm.id, { name: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Labels to Watch (comma-separated)</label>
                  <input defaultValue={(gm.labels_to_watch || []).join(", ")} onBlur={(e) => updateGmail(gm.id, { labels_to_watch: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="INBOX, CATEGORY_PERSONAL" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={gm.auto_create_leads} onChange={(e) => updateGmail(gm.id, { auto_create_leads: e.target.checked })} className="rounded" />
                    Auto-create leads
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={gm.is_active} onChange={(e) => updateGmail(gm.id, { is_active: e.target.checked })} className="rounded" />
                    Active
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 hover:text-destructive ml-auto" onClick={() => deleteGmail(gm.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              {gm.last_sync_at && (
                <p className="text-[10px] text-muted-foreground">Last synced: {new Date(gm.last_sync_at).toLocaleString()}</p>
              )}
            </div>
          ))}
        </TabsContent>

        {/* ═══ Webhooks ═══ */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Webhook Integrations</h3>
              <p className="text-xs text-muted-foreground">Set up webhook endpoints for Crisp, YCBM, and Gmail to auto-create leads.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!webhookConfigs.find(w => w.service === "crisp") && (
                <Button variant="outline" size="sm" onClick={() => addWebhook("crisp")}><Plus className="w-3 h-3 mr-1" /> Crisp</Button>
              )}
              {!webhookConfigs.find(w => w.service === "ycbm") && (
                <Button variant="outline" size="sm" onClick={() => addWebhook("ycbm")}><Plus className="w-3 h-3 mr-1" /> YCBM</Button>
              )}
              {!webhookConfigs.find(w => w.service === "gmail") && (
                <Button variant="outline" size="sm" onClick={() => addWebhook("gmail")}><Plus className="w-3 h-3 mr-1" /> Gmail</Button>
              )}
            </div>
          </div>

          {webhookConfigs.map(wh => (
            <div key={wh.id} className="pearl-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold capitalize">{wh.service} Webhook</h4>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={wh.is_active} onChange={(e) => updateWebhook(wh.id, { is_active: e.target.checked })} className="rounded" />
                  Active
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Webhook URL (paste into {wh.service === "crisp" ? "Crisp Dashboard → Settings → Webhooks" : wh.service === "gmail" ? "Google Cloud Pub/Sub → Subscription" : "YCBM → Settings → Notifications → Webhook"})
                  </label>
                  <div className="flex gap-2">
                    <input readOnly value={`${webhookUrl}?service=${wh.service}&secret=${wh.webhook_secret}`} className="h-8 w-full rounded-lg border border-input bg-muted/50 px-3 text-xs font-mono" />
                    <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => copyText(`${webhookUrl}?service=${wh.service}&secret=${wh.webhook_secret}`, wh.id)}>
                      {copiedWebhook === wh.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                {wh.service === "crisp" && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Crisp API Token ID (optional, for advanced features)</label>
                      <input defaultValue={wh.api_key} onBlur={(e) => updateWebhook(wh.id, { api_key: e.target.value })} className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm" placeholder="Enter Crisp API token..." />
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
                      <p><strong>Setup:</strong> Go to Crisp Dashboard → Settings → Webhooks → Add endpoint</p>
                      <p>Paste the URL above. Subscribe to <strong>all events</strong> for full tracking:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {crispEventsList.map(ev => (
                          <code key={ev} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{ev}</code>
                        ))}
                      </div>
                      <p className="mt-2">Messages auto-create leads. Session events enrich lead profiles. People events sync contact info.</p>
                    </div>
                  </>
                )}
                {wh.service === "ycbm" && (
                  <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                    <p><strong>Setup:</strong> Go to YCBM → Your Calendar → Notifications → Webhooks</p>
                    <p>Paste the URL above. New bookings will auto-create leads in your Lead Management.</p>
                  </div>
                )}
                {wh.service === "gmail" && (
                  <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                    <p><strong>Setup:</strong> Google Workspace supports push notifications via Pub/Sub.</p>
                    <p>For simpler setup, use the Gmail tab's "Sync Now" button or configure periodic syncing.</p>
                    <p>For real-time: Set up a Google Cloud Pub/Sub topic and push subscription pointing to this URL.</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {webhookConfigs.length === 0 && (
            <div className="text-center py-8"><Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No webhooks configured. Add one above to auto-capture leads.</p></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WidgetSettings;

