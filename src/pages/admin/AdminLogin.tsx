import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/parent";
import { supabase as cloud } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await mirrorToCloud(email, password);
        nav("/admin", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        await mirrorToCloud(email, password);
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="admin-theme min-h-screen grid place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-sm bg-background rounded-2xl p-6 shadow-lg border">
        <h1 className="font-display text-2xl mb-1">Admin {mode === "signin" ? "sign in" : "sign up"}</h1>
        <p className="text-sm text-muted-foreground mb-4">Connected to Pearl Lemon parent CMS.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-muted-foreground mt-4 underline"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
