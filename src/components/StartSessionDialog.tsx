import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardPaste, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QuestionView } from "./QuestionView";
import { supabase } from "@/integrations/supabase/client";
import { assistQuestion } from "@/lib/ai.functions";
import { emptyQuestion, type QuestionData } from "@/lib/types";
import { importedQuestion } from "@/lib/question-patch";
import { Input } from "@/components/ui/input";

export function StartSessionDialog({ mode, onClose, userId, questions, initialQuestion }: {
  mode: "solo" | "mock"; onClose: () => void; userId: string;
  questions: { id: string; question: QuestionData }[]; initialQuestion?: QuestionData;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const assist = useServerFn(assistQuestion);
  const [source, setSource] = useState("bank");
  const [questionId, setQuestionId] = useState("blank");
  const [pasted, setPasted] = useState("");
  const [freeText, setFreeText] = useState("");
  const [freeTitle, setFreeTitle] = useState("");
  const [freeFormat, setFreeFormat] = useState("markdown");
  const [parsed, setParsed] = useState<QuestionData | null>(null);
  const [saveBank, setSaveBank] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"parse" | "create" | null>(null);
  async function parse() {
    setBusy("parse");
    try {
      const res = await assist({ data: { action: "import", question: emptyQuestion(), pasted: source === "free" ? freeText : pasted } });
      if (!res.ok) { toast.error(res.error); return; }
      const q = importedQuestion(res.patch);
      if (!q.description.trim()) { toast.error("No question found. Paste the full problem and try again."); return; }
      setParsed(q); setSavedId(null);
    } catch { toast.error("Could not format the question. Please try again."); }
    finally { setBusy(null); }
  }
  async function create() {
    const freeform = { ...emptyQuestion(), title: freeTitle || "Freeform session", description: freeFormat === "code" ? `\`\`\`\n${freeText}\n\`\`\`` : freeText };
    const question = initialQuestion ?? (source === "paste" ? parsed : source === "free" || questionId === "blank" ? parsed ?? freeform : questions.find(q => q.id === questionId)?.question);
    if (!question) return;
    setBusy("create");
    try {
      if (!initialQuestion && (source === "paste" || source === "free") && saveBank && !savedId && question.description.trim()) {
        const { data, error } = await supabase.from("questions").insert({ ...question, owner_id: userId }).select("id").single();
        if (error) throw error;
        setSavedId(data.id);
        await qc.invalidateQueries({ queryKey: ["questions"] });
      }
      const { data, error } = await supabase.from("sessions").insert({ host_id: userId, mode, title: question.title, question, code: question.starter_code["python"] ?? "" }).select("id").single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      onClose();
      navigate({ to: "/session/$id", params: { id: data.id } });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not open the room. Please try again."); }
    finally { setBusy(null); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{mode === "solo" ? "Practice solo" : "Start a mock interview"}</DialogTitle></DialogHeader>
      {initialQuestion ? <QuestionView q={initialQuestion} /> : <Tabs value={source} onValueChange={setSource}>
        <TabsList className="flex h-auto w-full flex-wrap"><TabsTrigger value="bank">Question bank</TabsTrigger><TabsTrigger value="free">Freeform</TabsTrigger><TabsTrigger value="paste"><ClipboardPaste /> Paste & AI</TabsTrigger></TabsList>
        <TabsContent value="bank" className="space-y-2">
          <Label>Question</Label><Select value={questionId} onValueChange={setQuestionId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="blank">No question (freeform)</SelectItem>{questions.map(q => <SelectItem key={q.id} value={q.id}>{q.question.title}</SelectItem>)}
          </SelectContent></Select>
          {questionId === "blank" && <Button variant="outline" onClick={() => setSource("free")}>Edit freeform question</Button>}
        </TabsContent>
        <TabsContent value="free" className="space-y-4">
          <Label htmlFor="free-title">Title</Label><Input id="free-title" value={freeTitle} onChange={e => setFreeTitle(e.target.value)} />
          <Tabs value={freeFormat} onValueChange={v => { setFreeFormat(v); setParsed(null); }}><TabsList><TabsTrigger value="markdown">Markdown</TabsTrigger><TabsTrigger value="code">Code editor</TabsTrigger></TabsList></Tabs>
          <Label htmlFor="free-question">Question</Label><Textarea id="free-question" className="min-h-48 whitespace-pre font-mono text-sm" spellCheck={false} value={freeText} onChange={e => { setFreeText(e.target.value); setParsed(null); setSavedId(null); }} />
          <Button variant="outline" disabled={!!busy || !freeText.trim()} onClick={parse}><Sparkles />{busy === "parse" ? "Formatting…" : "AI Reformat"}</Button>
          {parsed && <QuestionView q={parsed} />}
          <div className="flex items-center gap-2"><Checkbox id="free-save-bank" checked={saveBank} onCheckedChange={v => setSaveBank(v === true)} /><Label htmlFor="free-save-bank">Save to my question bank</Label></div>
        </TabsContent>
        <TabsContent value="paste" className="space-y-4">
          <Label htmlFor="session-paste">Paste from LeetCode / HackerRank</Label>
          <Textarea id="session-paste" className="min-h-40 font-mono text-xs" value={pasted} onChange={e => { setPasted(e.target.value); setParsed(null); setSavedId(null); }} disabled={!!busy} />
          <Button variant="outline" disabled={!!busy || !pasted.trim()} onClick={parse}><Sparkles />{busy === "parse" ? "Formatting…" : "Parse & Reformat"}</Button>
          {parsed && <div className="space-y-2 border-t pt-4"><QuestionView q={parsed} /><p className="font-mono text-xs text-muted-foreground">{parsed.test_cases.length} test cases</p></div>}
          <div className="flex items-center gap-2"><Checkbox id="save-bank" checked={saveBank} onCheckedChange={v => setSaveBank(v === true)} /><Label htmlFor="save-bank">Save to my question bank</Label></div>
        </TabsContent>
      </Tabs>}
      <Button disabled={!!busy || (!initialQuestion && source === "paste" && !parsed)} onClick={create}>{busy === "create" ? "Opening…" : "Open room"}</Button>
    </DialogContent>
  </Dialog>;
}