import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MAX_FEEDBACK_LENGTH, validFeedback } from "@/lib/interview-feedback";

export function InterviewFeedback({ sessionId, userId, canPost }: { sessionId: string; userId: string; canPost: boolean }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const feedback = useQuery({
    queryKey: ["feedback", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("session_feedback").select("*").eq("session_id", sessionId).order("created_at").order("id");
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
  useEffect(() => {
    const channel = supabase.channel(`feedback-${sessionId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_feedback", filter: `session_id=eq.${sessionId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["feedback", sessionId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  async function post() {
    if (!canPost || sending || !validFeedback(body)) return;
    setSending(true);
    const { error } = await supabase.from("session_feedback").insert({ session_id: sessionId, author_id: userId, body: body.trim() });
    setSending(false);
    if (error) { toast.error("Could not save feedback. Your text is still here."); return; }
    setBody("");
    await qc.invalidateQueries({ queryKey: ["feedback", sessionId] });
  }

  return <section className="min-w-0 space-y-3 border-t pt-5" aria-label="Interviewer feedback">
    <h2 className="font-display font-semibold">Interviewer feedback</h2>
    {feedback.isPending && <p className="text-sm text-muted-foreground">Loading feedback…</p>}
    {feedback.isError && <p className="text-sm text-destructive">Feedback could not be loaded.</p>}
    {feedback.data?.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
    <ol className="space-y-3" aria-live="polite">
      {feedback.data?.map(note => <li key={note.id} className="border-l-2 border-primary pl-3">
        <time dateTime={note.created_at} className="font-mono text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" })}</time>
        <p className="mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{note.body}</p>
      </li>)}
    </ol>
    {canPost && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void post(); }}>
      <Textarea aria-label="Feedback" placeholder="Feedback for the candidate…" value={body} onChange={e => setBody(e.target.value)} maxLength={MAX_FEEDBACK_LENGTH} disabled={sending} className="min-h-24" />
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">{body.length}/{MAX_FEEDBACK_LENGTH}</span><Button type="submit" size="sm" disabled={sending || !validFeedback(body)}><Send />{sending ? "Saving…" : "Post feedback"}</Button></div>
    </form>}
  </section>;
}