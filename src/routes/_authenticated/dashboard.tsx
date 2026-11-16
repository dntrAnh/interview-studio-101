import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, FileCode2, Plus, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { emptyQuestion, type QuestionData } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Interview Studio" },
      { name: "description", content: "Your questions, sessions and snapshots." },
      { property: "og:title", content: "Dashboard — Interview Studio" },
      { property: "og:description", content: "Your questions, sessions and snapshots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const fmtDate = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [startMode, setStartMode] = useState<"solo" | "mock" | null>(null);
  const [questionId, setQuestionId] = useState<string>("blank");
  const [creating, setCreating] = useState(false);

  const questions = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sessions").select("id, title, mode, host_id, created_at, status").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  const snapshots = useQuery({
    queryKey: ["snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("snapshots").select("id, title, created_at, session_id").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function startSession() {
    if (!startMode) return;
    setCreating(true);
    const q = questions.data?.find((x) => x.id === questionId);
    const question: QuestionData = q
      ? {
          title: q.title, difficulty: q.difficulty, description: q.description,
          hints: (q.hints as string[]) ?? [], complexity: q.complexity,
          starter_code: (q.starter_code as Record<string, string>) ?? {},
          test_cases: (q.test_cases as QuestionData["test_cases"]) ?? [],
        }
      : { ...emptyQuestion(), title: "Freeform session" };
    const { data, error } = await supabase
      .from("sessions")
      .insert({ host_id: user.id, mode: startMode, title: question.title, question, code: question.starter_code["python"] ?? "" })
      .select("id")
      .single();
    setCreating(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/session/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-primary">~/dashboard</p>
            <h1 className="font-display text-3xl font-bold">Ready when you are</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStartMode("solo")}><Timer /> Practice solo</Button>
            <Button onClick={() => setStartMode("mock")}><Users /> Start mock interview</Button>
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">My questions</h2>
            <Button asChild size="sm" variant="secondary"><Link to="/questions/$id" params={{ id: "new" }}><Plus /> New question</Link></Button>
          </div>
          {questions.data?.length === 0 && <Empty text="No questions yet. Write one or paste one from LeetCode." />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {questions.data?.map((q) => (
              <Link key={q.id} to="/questions/$id" params={{ id: q.id }} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  <span className="truncate font-medium">{q.title}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{q.difficulty} · {(q.test_cases as unknown[]).length} tests</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Sessions</h2>
            {sessions.data?.length === 0 && <Empty text="No sessions yet." />}
            <ul className="divide-y rounded-lg border bg-card">
              {sessions.data?.map((s) => (
                <li key={s.id}>
                  <Link to="/session/$id" params={{ id: s.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                    {s.mode === "mock" ? <Users className="h-4 w-4 text-accent" /> : <Timer className="h-4 w-4 text-primary" />}
                    <span className="flex-1 truncate">{s.title || "Untitled"}</span>
                    <span className="font-mono text-xs text-muted-foreground">{s.host_id === user.id ? "host" : "guest"} · {fmtDate(s.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Snapshots</h2>
            {snapshots.data?.length === 0 && <Empty text="Save a snapshot from any session to keep a frozen record." />}
            <ul className="divide-y rounded-lg border bg-card">
              {snapshots.data?.map((s) => (
                <li key={s.id}>
                  <Link to="/snapshot/$id" params={{ id: s.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                    <Camera className="h-4 w-4 text-accent" />
                    <span className="flex-1 truncate">{s.title || "Snapshot"}</span>
                    <span className="font-mono text-xs text-muted-foreground">{fmtDate(s.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Dialog open={startMode !== null} onOpenChange={(o) => !o && setStartMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{startMode === "mock" ? "Start a mock interview" : "Practice solo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Question</Label>
            <Select value={questionId} onValueChange={setQuestionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">No question (freeform)</SelectItem>
                {questions.data?.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {startMode === "mock" && <p className="text-sm text-muted-foreground">You'll be the interviewer. Share the room link so a friend can join.</p>}
          </div>
          <Button onClick={startSession} disabled={creating}>{creating ? "Creating…" : "Open room"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
