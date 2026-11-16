import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Link2, LogOut, Play, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AppHeader } from "@/components/AppHeader";
import { QuestionView } from "@/components/QuestionView";
import { TimerControl } from "@/components/TimerControl";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { OutputPanel } from "@/components/OutputPanel";
import { useRoom, type SharedState } from "@/lib/useRoom";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { runCode } from "@/lib/run.functions";
import { elapsedMs, emptyQuestion, type QuestionData } from "@/lib/types";
import { useIsDark } from "@/lib/theme";

const CollabEditor = lazy(() => import("@/components/CollabEditor"));

export const Route = createFileRoute("/_authenticated/session/$id")({
  head: () => ({
    meta: [
      { title: "Interview room — Interview Studio" },
      { name: "description", content: "Live coding interview room with question, editor and timer." },
      { property: "og:title", content: "Interview room — Interview Studio" },
      { property: "og:description", content: "Join this live coding interview room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionPage,
});

function SessionPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const session = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      let { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      if (!data) {
        await supabase.rpc("join_session", { _session: id });
        ({ data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle());
      }
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      return { session: data, name: profile?.display_name || user.email?.split("@")[0] || "You" };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (session.isLoading) return <div className="grid min-h-screen place-items-center font-mono text-sm text-muted-foreground">joining room…</div>;
  if (!session.data?.session)
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div><p className="font-display text-xl">Room not found</p>
          <Button asChild className="mt-4" variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button></div>
      </div>
    );
  return <Room s={session.data.session} myName={session.data.name} userId={user.id} />;
}

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

function Room({ s, myName, userId }: { s: SessionRow; myName: string; userId: string }) {
  const navigate = useNavigate();
  const dark = useIsDark();
  const run = useServerFn(runCode);
  const isHost = s.host_id === userId;
  const question: QuestionData = { ...emptyQuestion(), ...(s.question as Partial<QuestionData>) };
  const role = s.mode === "solo" ? "solo" : isHost ? "interviewer" : "interviewee";
  const initial: SharedState = {
    language: s.language,
    hintsVisible: s.hints_visible,
    timer: { kind: s.mode === "solo" ? "countdown" : "stopwatch", running: false, startedAt: null, accumulatedMs: 0, durationMs: 45 * 60000 },
    results: null,
    runError: null,
  };
  const room = useRoom({ sessionId: s.id, me: { id: userId, name: myName, role }, initial, initialCode: s.code || question.starter_code[s.language] || getLanguage(s.language).starter });
  const { state, setState, ytext } = room;
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState("");
  const [showHints, setShowHints] = useState(false);

  // Persist the latest code and settings so the room survives everyone leaving.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const save = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase.from("sessions").update({ code: ytext.toString(), language: stateRef.current.language, hints_visible: stateRef.current.hintsVisible, updated_at: new Date().toISOString() }).eq("id", s.id).then();
      }, 2000);
    };
    ytext.observe(save);
    return () => ytext.unobserve(save);
  }, [ytext, s.id]);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!room.ready) return;
    supabase.from("sessions").update({ language: state.language, hints_visible: state.hintsVisible }).eq("id", s.id).then();
  }, [state.language, state.hintsVisible, room.ready, s.id]);

  function changeLanguage(lang: string) {
    const current = ytext.toString().trim();
    const isTemplate = !current || LANGUAGES.some((l) => l.starter.trim() === current) || Object.values(question.starter_code).some((c) => c.trim() === current);
    if (isTemplate) {
      ytext.doc?.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, question.starter_code[lang] || getLanguage(lang).starter);
      });
    }
    setState({ language: lang });
  }

  async function onRun() {
    setRunning(true);
    try {
      const res = await run({ data: { language: state.language, code: ytext.toString(), tests: question.test_cases, customInput: stdin } });
      setState({ results: res.results, runError: res.error });
    } catch {
      setState({ runError: "Could not run the code.", results: null });
    } finally {
      setRunning(false);
    }
  }

  async function snapshot() {
    const { error, data } = await supabase.from("snapshots").insert({
      session_id: s.id,
      owner_id: userId,
      title: `${question.title || "Session"} · ${new Date().toLocaleString()}`,
      data: {
        mode: s.mode,
        question,
        code: ytext.toString(),
        language: state.language,
        results: state.results,
        runError: state.runError,
        hintsVisible: state.hintsVisible,
        timer: { kind: state.timer.kind, elapsedMs: elapsedMs(state.timer), durationMs: state.timer.durationMs },
        participants: room.peers.map((p) => ({ name: p.name, role: p.role })),
        savedAt: new Date().toISOString(),
      },
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Snapshot saved", { action: { label: "View", onClick: () => navigate({ to: "/snapshot/$id", params: { id: data.id } }) } });
  }

  async function endSession() {
    if (isHost) await supabase.from("sessions").update({ status: "ended", code: ytext.toString() }).eq("id", s.id);
    navigate({ to: "/dashboard" });
  }

  const canSeeHints = isHost || state.hintsVisible;
  const hasHints = question.hints.length > 0 || !!question.complexity;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader>
        <span className="truncate font-mono text-sm text-muted-foreground">/ {question.title || "session"}</span>
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{role}</span>
        <div className="ml-auto flex items-center gap-2">
          <TimerControl timer={state.timer} onChange={(timer) => setState({ timer })} />
          <div className="flex -space-x-2">
            {room.peers.map((p) => (
              <span key={p.userId} title={`${p.name} (${p.role})`} className="grid h-7 w-7 place-items-center rounded-full border-2 border-panel bg-secondary font-mono text-xs font-bold" style={{ color: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
          {s.mode === "mock" && (
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Invite link copied"); }}>
              <Link2 /> Invite
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={snapshot}><Camera /> Snapshot</Button>
          <Button size="sm" variant="ghost" onClick={endSession}><LogOut /> {isHost ? "End" : "Leave"}</Button>
        </div>
      </AppHeader>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="40%" minSize="20%">
          <div className="h-full space-y-6 overflow-y-auto p-6">
            <QuestionView q={question} />
            {hasHints && (
              <div className="rounded-lg border bg-panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-display font-semibold"><Lightbulb className="h-4 w-4 text-accent" /> Hints</span>
                  {isHost && s.mode === "mock" ? (
                    <Button size="sm" variant={state.hintsVisible ? "secondary" : "outline"} onClick={() => setState({ hintsVisible: !state.hintsVisible })}>
                      {state.hintsVisible ? <><Eye /> Shown to interviewee</> : <><EyeOff /> Hidden from interviewee</>}
                    </Button>
                  ) : canSeeHints ? (
                    <Button size="sm" variant="ghost" onClick={() => setShowHints(!showHints)}>{showHints ? "Hide" : "Reveal"}</Button>
                  ) : null}
                </div>
                {!canSeeHints && <p className="mt-2 text-sm text-muted-foreground">The interviewer hasn't shared hints yet.</p>}
                {canSeeHints && (showHints || (isHost && s.mode === "mock") || (!isHost && state.hintsVisible)) && (
                  <div className="mt-3 space-y-2 text-sm">
                    {question.hints.map((h, i) => <p key={i}><span className="mr-2 font-mono text-xs text-accent">#{i + 1}</span>{h}</p>)}
                    {question.complexity && <p className="rounded bg-muted px-2 py-1 font-mono text-xs">Complexity: {question.complexity}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="60%" minSize="30%">
          <div className="flex h-full flex-col">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b bg-panel px-3 py-1.5">
                  <Select value={state.language} onValueChange={changeLanguage}>
                    <SelectTrigger className="h-8 w-40" aria-label="Language"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="font-mono text-xs text-muted-foreground">{room.ready ? "● live" : "connecting…"}</span>
                  <Button size="sm" className="ml-auto" onClick={onRun} disabled={running}><Play /> {running ? "Running…" : question.test_cases.length ? "Run tests" : "Run"}</Button>
                </div>
                <div className="min-h-0 flex-1">
                  {room.ready ? (
                    <Suspense fallback={<div className="p-4 font-mono text-xs text-muted-foreground">loading editor…</div>}>
                      <CollabEditor ytext={ytext} awareness={room.awareness} language={getLanguage(state.language).monaco} dark={dark} />
                    </Suspense>
                  ) : (
                    <div className="p-4 font-mono text-xs text-muted-foreground">syncing code…</div>
                  )}
                </div>
              </div>
              <div className="h-60 shrink-0 border-t">
                <OutputPanel state={state} hasTests={question.test_cases.length > 0} stdin={stdin} setStdin={setStdin} />
              </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

