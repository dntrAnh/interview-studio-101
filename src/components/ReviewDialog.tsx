import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CodeReview } from "@/lib/ai.functions";

const VERDICT: Record<CodeReview["verdict"], { label: string; cls: string }> = {
  correct: { label: "Correct", cls: "bg-primary/15 text-primary" },
  partially_correct: { label: "Partially correct", cls: "bg-accent/15 text-accent" },
  incorrect: { label: "Incorrect", cls: "bg-destructive/15 text-destructive" },
};

export function ReviewDialog({ review, loading, open, onOpenChange }: { review: CodeReview | null; loading: boolean; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>AI code review</DialogTitle></DialogHeader>
        {loading && <p className="font-mono text-sm text-muted-foreground">reviewing your solution…</p>}
        {!loading && review && (
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-semibold ${VERDICT[review.verdict].cls}`}>{VERDICT[review.verdict].label}</span>
              <p className="leading-relaxed">{review.correctness}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-panel p-3"><p className="font-mono text-xs text-muted-foreground">Time</p><p className="mt-1">{review.time_complexity}</p></div>
              <div className="rounded-lg border bg-panel p-3"><p className="font-mono text-xs text-muted-foreground">Space</p><p className="mt-1">{review.space_complexity}</p></div>
            </div>
            <Section title="Missed edge cases" items={review.edge_cases} empty="No missed edge cases found." />
            <Section title="Suggestions" items={review.suggestions} empty="Nothing to add." />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="font-display font-semibold">{title}</p>
      {items.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-muted-foreground">{empty}</p>}
    </div>
  );
}
