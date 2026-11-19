import { lazy, Suspense, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QuestionView } from "./QuestionView";
import { supabase } from "@/integrations/supabase/client";
import { emptyQuestion, type QuestionData } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useIsDark } from "@/lib/theme";
import { interviewName } from "@/lib/room-settings";
const QuestionTextEditor = lazy(() => import("./CollabEditor").then(m => ({ default: m.QuestionTextEditor })));

export function StartSessionDialog({ mode, onClose, userId, questions, initialQuestion }: {
  mode: "solo" | "mock"; onClose: () => void; userId: string;
  questions: { id: string; question: QuestionData }[]; initialQuestion?: QuestionData;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dark = useIsDark();
  const [source, setSource] = useState("bank");
  const [roomName, setRoomName] = useState("");
  const [questionId, setQuestionId] = useState("blank");
  const [freeText, setFreeText] = useState("");
  const [freeTitle, setFreeTitle] = useState("");
  const [freeFormat, setFreeFormat] = useState("markdown");
  const [saveBank, setSaveBank] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | null>(null);
  async function create() {
    const freeform = { ...emptyQuestion(), title: freeTitle || "Freeform session", description: freeFormat === "code" ? `\`\`\`\n${freeText}\n\`\`\`` : freeText };
    const question = initialQuestion ?? (source === "free" || questionId === "blank" ? freeform : questions.find(q => q.id === questionId)?.question);
    if (!question) return;
    setBusy("create");
    try {
      if (!initialQuestion && (source === "free" || questionId === "blank") && saveBank && !savedId && question.description.trim()) {
        const { data, error } = await supabase.from("questions").insert({ ...question, owner_id: userId }).select("id").single();
        if (error) throw error;
        setSavedId(data.id);
        await qc.invalidateQueries({ queryKey: ["questions"] });
      }
      const { data, error } = await supabase.from("sessions").insert({ host_id: userId, mode, title: mode === "mock" ? interviewName(roomName, question.title) : question.title, question, code: mode === "mock" ? "import sys\n\n" : question.starter_code["python"] ?? "" }).select("id").single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["sessions"] });
      onClose();
      navigate({ to: "/session/$id", params: { id: data.id } });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not open the room. Please try again."); }
    finally { setBusy(null); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] min-w-0 flex-col overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12"><DialogTitle>{mode === "solo" ? "Practice solo" : "Start a mock interview"}</DialogTitle></DialogHeader>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
      {mode === "mock" && <div className="space-y-2 py-4"><Label htmlFor="interview-name">Interview name</Label><Input id="interview-name" value={roomName} onChange={e => setRoomName(e.target.value)} maxLength={120} placeholder="Mock interview" /></div>}
      {initialQuestion ? <QuestionView q={initialQuestion} /> : <Tabs value={source} onValueChange={v => { setSource(v); setSavedId(null); }}>
        <TabsList className="flex h-auto w-full flex-wrap"><TabsTrigger value="bank">Question bank</TabsTrigger><TabsTrigger value="free">Freeform</TabsTrigger></TabsList>
        <TabsContent value="bank" className="space-y-2">
          <Label>Question</Label><Select value={questionId} onValueChange={setQuestionId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="blank">No question (freeform)</SelectItem>{questions.map(q => <SelectItem key={q.id} value={q.id}>{q.question.title}</SelectItem>)}
          </SelectContent></Select>
          {questionId === "blank" && <Button variant="outline" onClick={() => setSource("free")}>Edit freeform question</Button>}
        </TabsContent>
        <TabsContent value="free" className="space-y-4">
          <Label htmlFor="free-title">Title</Label><Input id="free-title" value={freeTitle} onChange={e => setFreeTitle(e.target.value)} />
          <Tabs value={freeFormat} onValueChange={setFreeFormat}><TabsList><TabsTrigger value="markdown">Markdown</TabsTrigger><TabsTrigger value="code">Code editor</TabsTrigger></TabsList></Tabs>
          <Label htmlFor="free-question">Question</Label>{freeFormat === "code" ? <Suspense fallback={<p className="text-muted-foreground">Loading editor…</p>}><QuestionTextEditor value={freeText} dark={dark} onChange={v => { setFreeText(v); setSavedId(null); }} /></Suspense> : <Textarea id="free-question" className="min-h-48 font-mono text-sm" spellCheck={false} value={freeText} onChange={e => { setFreeText(e.target.value); setSavedId(null); }} />}
          <div className="flex items-center gap-2"><Checkbox id="free-save-bank" checked={saveBank} onCheckedChange={v => setSaveBank(v === true)} /><Label htmlFor="free-save-bank">Save to my question bank</Label></div>
        </TabsContent>
      </Tabs>}
      </div>
      <div className="shrink-0 border-t px-6 py-4"><Button className="w-full" disabled={!!busy} onClick={create}>{busy === "create" ? "Opening…" : "Open room"}</Button></div>
    </DialogContent>
  </Dialog>;
}
