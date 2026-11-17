import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/session-context";

type Search = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s['redirect'] === "string" && s['redirect'].startsWith("/") && !s['redirect'].startsWith("//") ? s['redirect'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Interview Studio" },
      { name: "description", content: "Sign in or create an account to practice coding interviews." },
      { property: "og:title", content: "Sign in — Interview Studio" },
      { property: "og:description", content: "Sign in or create an account to practice coding interviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const user = useSessionUser();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (user) navigate({ to: redirect ?? "/dashboard", replace: true });
  }, [user, redirect, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect ?? "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + (redirect ?? "/dashboard"), data: { display_name: name } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader signedIn={false} />
      <main className="grid flex-1 place-items-center bg-grid px-4">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-xl">
          {sent ? (
            <div className="space-y-2 text-center">
              <h1 className="font-display text-xl font-semibold">Check your email</h1>
              <p className="text-sm text-muted-foreground">We sent a confirmation link to {email}. Open it to finish signing up.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="font-display text-2xl font-semibold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
              </Button>
              <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
