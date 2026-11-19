import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hintLines, visibleHints } from "@/lib/hints";

/**
 * Hints for a solo practice room. Hidden by default: each click on "Reveal hint"
 * uncovers the next line, labelled Hint 1, Hint 2, ... Nothing renders when the
 * question carries no hints.
 */
export function SoloHints({ hints, complexity }: { hints: string[]; complexity?: string }) {
  const lines = hintLines(hints);
  const [revealed, setRevealed] = useState(0);
  if (!lines.length) return null;

  const shown = visibleHints(lines, revealed);
  const allShown = shown.length >= lines.length;

  return (
    <div className="rounded-lg border bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display font-semibold">
          <Lightbulb className="h-4 w-4 text-accent" /> Hints
        </span>
        {!allShown && (
          <Button size="sm" variant="outline" onClick={() => setRevealed((r) => r + 1)}>
            Reveal hint
          </Button>
        )}
      </div>
      {shown.length > 0 && (
        <div className="mt-3 space-y-2 text-sm">
          {shown.map((line, i) => (
            <p key={i}>
              <span className="mr-2 font-mono text-xs text-accent">Hint {i + 1}</span>
              <span className="[overflow-wrap:anywhere]">{line}</span>
            </p>
          ))}
          {allShown && complexity && (
            <p className="rounded bg-muted px-2 py-1 font-mono text-xs">Complexity: {complexity}</p>
          )}
        </div>
      )}
    </div>
  );
}
