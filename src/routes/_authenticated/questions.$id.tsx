import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardPaste, Lightbulb, LayoutList, Plus, Sparkles, Trash2, Wand2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppHeader } from "@/components/AppHeader";
import { QuestionView } from "@/components/QuestionView";
import { supabase } from "@/integrations/supabase/client";
import { assistQuestion, type AssistAction } from "@/lib/ai.functions";
import { emptyQuestion, type QuestionData } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { StartSessionDialog } from "@/components/StartSessionDialog";

export const Route = createFileRoute("/_authenticated/questions/$id")({
  head: () => ({
    meta: [
      { title: "Question editor — Interview Studio" },
      { name: "description", content: "Write and polish a coding interview question with AI help." },
      { property: "og:title", content: "Question editor — Interview Studio" },
      { property: "og:description", content: "Write and polish a coding interview question with AI help." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionEditor,
});

function QuestionEditor() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const assist = useServerFn(assistQuestion);
  const isNew = id === "new";
  const [q, setQ] = useState<QuestionData>(emptyQuestion());
  const [busy, setBusy] = useState<AssistAction | "save" | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [starterLang, setStarterLang] = useState("python");
  const [startMode, setStartMode] = useState<"solo" | "mock" | null>(null);

  const existing = useQuery({
    queryKey: ["question", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const d = existing.data;
    if (d) setQ({
      title: d.title, difficulty: d.difficulty, description: d.description,
      hints: (d.hints as string[]) ?? [], complexity: d.complexity,
      starter_code: (d.starter_code as Record<string, string>) ?? {},
      test_cases: (d.test_cases as QuestionData["test_cases"]) ?? [],
    });
  }, [existing.data]);

  const set = <K extends keyof QuestionData>(k: K, v: QuestionData[K]) => setQ((p) => ({ ...p, [k]: v }));

  async function runAssist(action: AssistAction) {
    if (action !== "import" && !q.description.trim() && !q.title.trim()) { toast.error("Write something first."); return; }
    setBusy(action);
    try {
      const res = await assist({ data: { action, question: q, pasted } });
      if (!res.ok) { toast.error(res.error); return; }
      const p = res.patch;
      setQ((prev) => ({
        ...prev,
        ...(typeof p.title === "string" && { title: p.title }),
        ...(typeof p.difficulty === "string" && { difficulty: p.difficulty }),
        ...(typeof p.description === "string" && { description: p.description }),
        ...(Array.isArray(p.hints) && { hints: p.hints.map(String) }),
        ...(typeof p.complexity === "string" && { complexity: p.complexity }),
        ...(Array.isArray(p.test_cases) && { test_cases: p.test_cases.map((t) => ({ input: String(t.input ?? ""), expected: String(t.expected ?? "") })) }),
      }));
      toast.success("Suggestion applied — review before saving.");
      if (action === "import") { setPasteOpen(false); setPasted(""); }
    } catch {
      toast.error("AI request failed.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    const row = { ...q, title: q.title || "Untitled question", updated_at: new Date().toISOString() };
    const res = isNew
      ? await supabase.from("questions").insert({ ...row, owner_id: user.id }).select("id").single()
      : await supabase.from("questions").update(row).eq("id", id).select("id").single();
    setBusy(null);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["questions"] });
    if (isNew) navigate({ to: "/questions/$id", params: { id: res.data.id }, replace: true });
  }

  async function remove() {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["questions"] });
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader>
        <span className="font-mono text-sm text-muted-foreground">/ {isNew ? "new question" : "edit question"}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStartMode("solo")}><Play />Practice now</Button>
          <Button size="sm" variant="outline" onClick={() => setStartMode("mock")}>Mock interview</Button>
          {!isNew && <Button variant="ghost" size="sm" onClick={remove}><Trash2 /> Delete</Button>}
          <Button size="sm" onClick={save} disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save"}</Button>
        </div>
      </AppHeader>

      <div className="flex flex-wrap gap-2 border-b bg-panel px-4 py-2">
        <span className="mr-1 flex items-center gap-1 font-mono text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-accent" /> AI</span>
        <Button size="sm" variant="outline" onClick={() => setPasteOpen(true)}><ClipboardPaste /> Import from LeetCode/HackerRank</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runAssist("phrase")}><Wand2 /> {busy === "phrase" ? "Working…" : "Improve phrasing"}</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runAssist("reformat")}><LayoutList /> {busy === "reformat" ? "Working…" : "Interview format"}</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runAssist("hints")}><Lightbulb /> {busy === "hints" ? "Working…" : "Suggest hints & complexity"}</Button>
      </div>

      <div className="grid flex-1 lg:grid-cols-2">
        <div className="space-y-5 border-r p-6">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-1.5"><Label>Title</Label><Input value={q.title} onChange={(e) => set("title", e.target.value)} placeholder="Two Sum" /></div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={q.difficulty} onValueChange={(v) => set("difficulty", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Easy", "Medium", "Hard"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea className="min-h-56 font-mono text-xs" value={q.description} onChange={(e) => set("description", e.target.value)} placeholder={"Problem statement…\n\n### Example 1\nInput: …\nOutput: …\n\n### Constraints\n- …"} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Hints</Label>
              <Button size="sm" variant="ghost" onClick={() => set("hints", [...q.hints, ""])}><Plus /> Add hint</Button></div>
            {q.hints.map((h, i) => (
              <div key={i} className="flex gap-2">
                <Input value={h} onChange={(e) => set("hints", q.hints.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Hint ${i + 1}`} />
                <Button size="icon" variant="ghost" aria-label="Remove hint" onClick={() => set("hints", q.hints.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
          </div>
          <div className="space-y-1.5"><Label>Time / space complexity</Label>
            <Input value={q.complexity} onChange={(e) => set("complexity", e.target.value)} placeholder="O(n) time, O(n) space" /></div>

          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Test cases (stdin → expected stdout)</Label>
              <Button size="sm" variant="ghost" onClick={() => set("test_cases", [...q.test_cases, { input: "", expected: "" }])}><Plus /> Add test</Button></div>
            {q.test_cases.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Textarea className="min-h-16 font-mono text-xs" value={t.input} placeholder="input" onChange={(e) => set("test_cases", q.test_cases.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)))} />
                <Textarea className="min-h-16 font-mono text-xs" value={t.expected} placeholder="expected output" onChange={(e) => set("test_cases", q.test_cases.map((x, j) => (j === i ? { ...x, expected: e.target.value } : x)))} />
                <Button size="icon" variant="ghost" aria-label="Remove test" onClick={() => set("test_cases", q.test_cases.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Starter code</Label>
              <Select value={starterLang} onValueChange={setStarterLang}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Textarea className="min-h-32 font-mono text-xs" value={q.starter_code[starterLang] ?? ""} placeholder="Leave empty to use the default template"
              onChange={(e) => set("starter_code", { ...q.starter_code, [starterLang]: e.target.value })} />
          </div>
        </div>
        <div className="bg-panel p-6">
          <p className="mb-4 font-mono text-xs text-muted-foreground">preview — what the interviewee sees</p>
          <QuestionView q={q} />
        </div>
      </div>

      {startMode && <StartSessionDialog mode={startMode} onClose={() => setStartMode(null)} userId={user.id} questions={[]} initialQuestion={q} />}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import a problem</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Paste the full problem text from LeetCode, HackerRank or anywhere. AI will turn it into a structured question with hints and tests.</p>
          <Textarea className="min-h-64 font-mono text-xs" value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <Button disabled={!pasted.trim() || busy === "import"} onClick={() => runAssist("import")}>{busy === "import" ? "Parsing…" : "Parse problem"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
