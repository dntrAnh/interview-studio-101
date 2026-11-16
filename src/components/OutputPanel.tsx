import { Textarea } from "@/components/ui/textarea";
import type { SharedState } from "@/lib/useRoom";

export function OutputPanel({ state, hasTests, stdin, setStdin }: { state: Pick<SharedState, "results" | "runError">; hasTests: boolean; stdin?: string; setStdin?: (v: string) => void }) {
  const passed = state.results?.filter((r) => r.passed).length ?? 0;
  return (
    <div className="h-full overflow-y-auto bg-panel p-3 font-mono text-xs">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span>output</span>
        {hasTests && state.results && <span className={passed === state.results.length ? "text-success" : "text-destructive"}>{passed}/{state.results.length} passed</span>}
      </div>
      {!hasTests && setStdin && (
        <Textarea className="mb-3 min-h-14 font-mono text-xs" placeholder="stdin (optional)" value={stdin} onChange={(e) => setStdin(e.target.value)} />
      )}
      {state.runError && <p className="text-destructive">{state.runError}</p>}
      {!state.results && !state.runError && <p className="text-muted-foreground">Run your code to see results here.</p>}
      <div className="space-y-2">
        {state.results?.map((r) => (
          <div key={r.index} className="rounded border bg-background p-2">
            <div className="mb-1 flex gap-2">
              <span className={r.passed === true ? "text-success" : r.passed === false ? "text-destructive" : "text-muted-foreground"}>
                {r.passed === true ? "✓ passed" : r.passed === false ? "✗ failed" : r.status}
              </span>
              {hasTests && <span className="text-muted-foreground">case {r.index + 1}</span>}
              {r.time && <span className="ml-auto text-muted-foreground">{r.time}s</span>}
            </div>
            {hasTests && <p className="whitespace-pre-wrap text-muted-foreground">in: {r.input}</p>}
            {r.expected !== null && <p className="whitespace-pre-wrap text-muted-foreground">expected: {r.expected}</p>}
            <p className="whitespace-pre-wrap">{r.stdout || (r.stderr ? "" : "(no output)")}</p>
            {r.stderr && <p className="whitespace-pre-wrap text-destructive">{r.stderr}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
