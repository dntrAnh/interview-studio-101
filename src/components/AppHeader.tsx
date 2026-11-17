import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/session-context";

export function Logo() {
  const user = useSessionUser();
  return (
    <Link to={user ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2 font-display text-lg font-bold">
      <span className="grid h-7 w-7 place-items-center rounded bg-primary font-mono text-sm text-primary-foreground">{"</>"}</span>
      Interview Studio
    </Link>
  );
}

export function AppHeader({ children, signedIn = true }: { children?: ReactNode; signedIn?: boolean }) {
  const user = useSessionUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    if (!confirm("Sign out of Interview Studio? This is different from ending or leaving a room.")) return;
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-panel px-4">
      <Logo />
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">{children}</div>
      <ThemeToggle />
      {(signedIn || user) && (
        <Button variant="ghost" size="sm" className="shrink-0 border-l" title="Sign out of your account" aria-label="Sign out" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      )}
    </header>
  );
}
