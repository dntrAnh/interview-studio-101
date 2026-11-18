import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Link2, Play, Lightbulb, Send, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { LANGUAGES, getLanguage, withStandardImports } from "@/lib/languages";
import { runCode } from "@/lib/run.functions";
import { runPythonLocally, warmPython } from "@/lib/python-runner";
import { elapsedMs, emptyQuestion, type QuestionData } from "@/lib/types";
import { useIsDark } from "@/lib/theme";
import { GUEST_SEATS, canEditRoom, isPastGuestRoom, roomExecutionMode } from "@/lib/room-access";
import { InterviewFeedback } from "@/components/InterviewFeedback";
import { canPostFeedback } from "@/lib/interview-feedback";
import { SubmissionTests } from "@/components/SubmissionTests";
import { savedSubmissionSchema } from "@/lib/submission";
import type { TestCase } from "@/lib/types";
import { initialRoomTimer, interviewName } from "@/lib/room-settings";

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
  const [joining, setJoining] = useState(false);
  const session = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      let { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      const { data: participant } = data && data.host_id !== user.id ? await supabase.from("session_participants").select("role").eq("session_id", id).eq("user_id", user.id).maybeSingle() : { data: null };
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      return { session: data, role: participant?.role, name: profile?.display_name || user.email?.split("@")[0] || "You" };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  if (session.isLoading) return <div className="grid min-h-screen place-items-center font-mono text-sm text-muted-foreground">joining room…</div>;
  async function join(role: "interviewee" | "spectator") {
    setJoining(true);
    const { error } = await supabase.rpc("join_session_as", { _session: id, _role: role });
    if (error) toast.error(error.message);
    else await session.refetch();
    setJoining(false);
  }
  if (!session.data?.session || (session.data.session.host_id !== user.id && !session.data.role && session.data.session.status === "active"))
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div className="space-y-4"><h1 className="font-display text-xl">Join mock interview</h1>
          <div className="flex flex-wrap justify-center gap-3"><Button disabled={joining} onClick={() => join("interviewee")}>Interviewee ({GUEST_SEATS.interviewee} seat)</Button><Button variant="outline" disabled={joining} onClick={() => join("spectator")}>Spectator ({GUEST_SEATS.spectator} seats)</Button></div>
          <Button asChild className="mt-4" variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button></div>
      </div>
    );
  return <Room key={`${id}:${session.data.session.status}`} s={session.data.session} myName={session.data.name} userId={user.id} guestRole={session.data.role} />;
}

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

function Room({ s, myName, userId, guestRole }: { s: SessionRow; myName: string; userId: string; guestRole?: string | undefined }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ending, setEnding] = useState(false);
  const dark = useIsDark();
  const run = useServerFn(runCode);
  const isHost = s.host_id === userId;
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(s.title);
  const pastRoom = isPastGuestRoom(s.mode, s.status, isHost);
  const runOnly = roomExecutionMode(s.mode) === "run-only";
  const question: QuestionData = { ...emptyQuestion(), ...(s.question as Partial<QuestionData>) };
  const saved = savedSubmissionSchema.safeParse(s.last_submission);
  const [addedTests, setAddedTests] = useState<TestCase[]>(saved.success ? saved.data.addedTests : []);
  const role = s.mode === "solo" ? "solo" : isHost ? "interviewer" : guestRole ?? "spectator";
  const spectator = !canEditRoom(role, pastRoom);
  const initial: SharedState = {
    language: s.language,
    hintsVisible: s.hints_visible,
    timer: pastRoom ? { ...initialRoomTimer(s.timer_state), running: false, startedAt: null, accumulatedMs: elapsedMs(initialRoomTimer(s.timer_state), new Date(s.updated_at).getTime()) } : initialRoomTimer(s.timer_state),
    results: saved.success ? saved.data.results : null,
    runError: saved.success ? saved.data.error : null,
  };
  const room = useRoom({ sessionId: s.id, me: { id: userId, name: myName, role }, initial, pastRoom, initialCode: pastRoom ? s.code : s.code || (runOnly ? s.language === "python" ? "import sys\n\n" : "\n" : question.starter_code[s.language] || getLanguage(s.language).starter) });
  const { state, setState, ytext } = room;
  useEffect(() => { if (state.language === "python") warmPython(); }, [state.language]);
  async function rename() {
    const title = interviewName(name, question.title);
    const { error } = await supabase.from("sessions").update({ title }).eq("id", s.id).eq("host_id", userId);
    if (error) { toast.error("Could not save the interview name."); return; }
    setName(title); setRenaming(false);
    await qc.invalidateQueries({ queryKey: ["sessions"] });
    await qc.invalidateQueries({ queryKey: ["session", s.id] });
  }
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState("");
  const [showHints, setShowHints] = useState(false);

  // Persist the latest code and settings so the room survives everyone leaving.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (spectator) return;
    const save = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase.from("sessions").update({ code: ytext.toString(), language: stateRef.current.language, hints_visible: stateRef.current.hintsVisible, updated_at: new Date().toISOString() }).eq("id", s.id).then();
      }, 2000);
    };
    ytext.observe(save);
    return () => {
      ytext.unobserve(save);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [ytext, s.id, spectator]);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!room.ready || spectator) return;
    supabase.from("sessions").update({ language: state.language, hints_visible: state.hintsVisible }).eq("id", s.id).then();
  }, [state.language, state.hintsVisible, room.ready, s.id, spectator]);
  useEffect(() => {
    if (!room.ready || spectator) return;
    void supabase.from("sessions").update({ timer_state: state.timer }).eq("id", s.id).then(({ error }) => {
      if (error) toast.error("Could not save the timer.");
    });
  }, [state.timer, room.ready, s.id, spectator]);

  function changeLanguage(lang: string) {
    if (spectator) return;
    const current = ytext.toString().trim();
    const isTemplate = !current || LANGUAGES.some((l) => l.starter.trim() === current) || Object.values(question.starter_code).some((c) => c.trim() === current);
    if (isTemplate) {
      ytext.doc?.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, runOnly ? lang === "python" ? "import sys\n\n" : "\n" : question.starter_code[lang] || getLanguage(lang).starter);
      });
    }
    setState({ language: lang });
  }

  async function onRun(submit = false) {
    if (spectator || (submit && runOnly)) return;
    setRunning(true);
    try {
      const code = ytext.toString();
      const tests = runOnly ? [] : submit ? [...question.test_cases, ...addedTests] : question.test_cases;
      const res = state.language === "python"
        ? await runPythonLocally(withStandardImports(code, "python"), tests, stdin)
        : await run({ data: { language: state.language, code, tests, customInput: stdin } });
      setState({ results: res.results, runError: res.error });
      if (submit || runOnly) {
        const { error } = await supabase.from("sessions").update({ code, language: state.language, last_submission: { code, language: state.language, addedTests, results: res.results, error: res.error, submittedAt: new Date().toISOString() } }).eq("id", s.id);
        if (error) toast.error(runOnly ? "Code ran, but the result could not be saved." : "Tests ran, but the submission could not be saved.");
        else if (submit) toast.success(res.error ? "Submission saved with runner error" : "Submission saved");
      }
    } catch {
      setState({ runError: "Could not run the code.", results: null });
    } finally {
      setRunning(false);
    }
  }

  async function snapshot() {
    const { data: feedback, error: feedbackError } = s.mode === "mock" ? await supabase.from("session_feedback").select("body,created_at").eq("session_id", s.id).order("created_at") : { data: [], error: null };
    if (feedbackError) { toast.error("Could not load feedback for this snapshot. Please try again."); return; }
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
        feedback: feedback ?? [],
      },
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Snapshot saved", { action: { label: "View", onClick: () => navigate({ to: "/snapshot/$id", params: { id: data.id } }) } });
  }

  async function endSession() {
    if (ending) return;
    if (pastRoom) { await navigate({ to: "/dashboard" }); return; }
    setEnding(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const result = isHost
        ? await supabase.from("sessions").update({ status: "ended", code: ytext.toString(), language: state.language, timer_state: { ...state.timer, running: false, startedAt: null, accumulatedMs: elapsedMs(state.timer) }, updated_at: new Date().toISOString() }).eq("id", s.id)
        : await supabase.from("session_participants").delete().eq("session_id", s.id).eq("user_id", userId);
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.removeQueries({ queryKey: ["session", s.id], exact: true });
      await navigate({ to: "/dashboard", replace: true });
    } catch { toast.error("Could not leave the room. You are still signed in; please try again."); }
    finally { setEnding(false); }
  }

  const canSeeHints = isHost || state.hintsVisible;
  const hasHints = question.hints.length > 0 || !!question.complexity;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader>
        {renaming ? <form className="flex shrink-0 items-center gap-1" onSubmit={e => { e.preventDefault(); void rename(); }}><Input aria-label="Interview name" className="h-8 w-40" maxLength={120} value={name} onChange={e => setName(e.target.value)} /><Button size="sm" type="submit">Save</Button><Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button></form> : <span className="max-w-48 shrink-0 truncate font-mono text-sm text-muted-foreground">/ {s.title || question.title || "session"}</span>}
        {s.mode === "mock" && isHost && !renaming && <Button size="icon" variant="ghost" title="Rename interview" aria-label="Rename interview" onClick={() => setRenaming(true)}><Pencil /></Button>}
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{role}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <TimerControl disabled={spectator} timer={state.timer} onChange={(timer) => { if (!spectator) setState({ timer }); }} />
          <div className="flex -space-x-2">
            {room.peers.map((p) => (
              <span key={p.userId} title={`${p.name} (${p.role})`} className="grid h-7 w-7 place-items-center rounded-full border-2 border-panel bg-secondary font-mono text-xs font-bold" style={{ color: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
          {s.mode === "mock" && s.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Invite link copied"); }}>
              <Link2 /> Invite
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={snapshot}><Camera /> Snapshot</Button>
          <Button size="sm" variant="ghost" onClick={endSession} disabled={ending}>{ending ? "Saving…" : pastRoom ? "Back to dashboard" : isHost ? "End" : "Leave"}</Button>
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
            {s.mode === "mock" && <InterviewFeedback sessionId={s.id} userId={userId} canPost={canPostFeedback(s.mode, isHost)} />}
            {!runOnly && <SubmissionTests tests={addedTests} onChange={setAddedTests} disabled={spectator || running} />}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="60%" minSize="30%">
          <div className="flex h-full flex-col">
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b bg-panel px-3 py-1.5">
                  <Select value={state.language} onValueChange={changeLanguage} disabled={spectator}>
                    <SelectTrigger className="h-8 w-40" aria-label="Language"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="font-mono text-xs text-muted-foreground">{pastRoom ? "Past room · read-only" : room.ready ? "● live" : "connecting…"}</span>
                  {!runOnly && <><Button size="sm" variant="outline" className="ml-auto" onClick={() => onRun(true)} disabled={running || spectator}><Send /> Submit</Button></>}
                  <Button size="sm" className={runOnly ? "ml-auto" : ""} onClick={() => onRun()} disabled={running || spectator}><Play /> {running ? "Running…" : !runOnly && question.test_cases.length ? "Run tests" : "Run"}</Button>
                </div>
                <div className="min-h-0 flex-1">
                  {room.ready ? (
                    <Suspense fallback={<div className="p-4 font-mono text-xs text-muted-foreground">loading editor…</div>}>
                      <CollabEditor ytext={ytext} awareness={room.awareness} language={getLanguage(state.language).monaco} dark={dark} readOnly={spectator} />
                    </Suspense>
                  ) : (
                    <div className="p-4 font-mono text-xs text-muted-foreground">syncing code…</div>
                  )}
                </div>
              </div>
              <div className="h-60 shrink-0 border-t">
                <OutputPanel state={state} hasTests={!runOnly && question.test_cases.length + addedTests.length > 0} stdin={stdin} {...(spectator ? {} : { setStdin })} />
              </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

