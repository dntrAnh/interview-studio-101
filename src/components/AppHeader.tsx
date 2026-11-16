import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded bg-primary font-mono text-sm text-primary-foreground">{"</>"}</span>
      Interview Studio
    </Link>
  );
}

export function AppHeader({ children, signedIn = true }: { children?: ReactNode; signedIn?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
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
      {signedIn && (
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
          <LogOut />
        </Button>
      )}
    </header>
  );
}
