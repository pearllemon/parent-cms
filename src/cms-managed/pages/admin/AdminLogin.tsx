import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Mirror the parent-CMS credentials into Lovable Cloud so server-side
// writes (e.g. WP XML import → imported_posts) pass RLS.
async function mirrorToCloud(email: string, password: string) {
  const { error: signInErr } = await cloud.auth.signInWithPassword({ email, password });
  if (!signInErr) return;
  // No matching Cloud account yet → create one (auto-confirm is on)
  const { error: signUpErr } = await cloud.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/admin` },
  });
  if (signUpErr && !/registered|exists/i.test(signUpErr.message)) {
    console.warn("Cloud mirror signup failed:", signUpErr.message);
    return;
  }
  // Try sign-in again after signup
  await cloud.auth.signInWithPassword({ email, password });
}

const AdminLogin = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await mirrorToCloud(email, password);
      nav("/admin", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen grid place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl p-6 shadow-lg border">
        <h1 className="font-display text-2xl mb-1">Admin Sign In</h1>
        <p className="text-sm text-muted-foreground mb-4">Connected to Pearl Lemon parent CMS.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
