import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { QuestionView } from "@/components/QuestionView";
import { supabase } from "@/integrations/supabase/client";
import { emptyQuestion, formatMs, type QuestionData, type RunResult } from "@/lib/types";
import { getLanguage } from "@/lib/languages";
import { OutputPanel } from "./session.$id";

export const Route = createFileRoute("/_authenticated/snapshot/$id")({
  head: () => ({
    meta: [
      { title: "Snapshot — Interview Studio" },
      { name: "description", content: "A frozen, read-only record of an interview session." },
      { property: "og:title", content: "Snapshot — Interview Studio" },
      { property: "og:description", content: "A frozen, read-only record of an interview session." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SnapshotPage,
});

type SnapData = {
  mode: string; question: QuestionData; code: string; language: string;
  results: RunResult[] | null; runError: string | null; hintsVisible: boolean;
  timer: { kind: string; elapsedMs: number; durationMs: number };
  participants: { name: string; role: string }[]; savedAt: string;
};

function SnapshotPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["snapshot", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("snapshots").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <div className="grid min-h-screen place-items-center font-mono text-sm text-muted-foreground">loading…</div>;
  if (!q.data) return <div className="grid min-h-screen place-items-center">Snapshot not found</div>;
  const d = q.data.data as unknown as SnapData;
  const question = { ...emptyQuestion(), ...d.question };
  const timeShown = d.timer.kind === "countdown" ? `${formatMs(d.timer.durationMs - d.timer.elapsedMs)} left of ${formatMs(d.timer.durationMs)}` : `${formatMs(d.timer.elapsedMs)} elapsed`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader>
        <Button asChild size="sm" variant="ghost"><Link to="/dashboard"><ArrowLeft /> Dashboard</Link></Button>
        <span className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs"><Lock className="h-3 w-3" /> read-only snapshot</span>
      </AppHeader>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-panel px-4 py-2 font-mono text-xs text-muted-foreground">
        <span>saved {new Date(d.savedAt).toLocaleString()}</span>
        <span>{d.mode} session</span>
        <span>{getLanguage(d.language).label}</span>
        <span className="text-accent">⏱ {timeShown}</span>
        <span>people: {d.participants.map((p) => `${p.name} (${p.role})`).join(", ") || "—"}</span>
      </div>
      <div className="grid flex-1 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6 border-r p-6">
          <QuestionView q={question} />
          {(question.hints.length > 0 || question.complexity) && (
            <div className="rounded-lg border bg-panel p-4 text-sm">
              <p className="mb-2 font-display font-semibold">Hints {d.hintsVisible ? "(shared)" : "(not shared)"}</p>
              {question.hints.map((h, i) => <p key={i}><span className="mr-2 font-mono text-xs text-accent">#{i + 1}</span>{h}</p>)}
              {question.complexity && <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-xs">Complexity: {question.complexity}</p>}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <pre className="flex-1 overflow-auto bg-card p-4 font-mono text-sm leading-6"><code>{d.code || "(empty)"}</code></pre>
          <div className="h-72 border-t">
            <OutputPanel state={{ results: d.results, runError: d.runError }} hasTests={question.test_cases.length > 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
