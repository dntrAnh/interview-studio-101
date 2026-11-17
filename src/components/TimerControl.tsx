import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { elapsedMs, formatMs, type TimerState } from "@/lib/types";

const DURATIONS = [15, 20, 30, 45, 60, 90];

export function TimerControl({ timer, onChange, disabled = false }: { timer: TimerState; onChange: (t: TimerState) => void; disabled?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const warned = useRef(false);
  useEffect(() => {
    if (!timer.running) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [timer.running]);

  const el = elapsedMs(timer, now);
  const shown = timer.kind === "countdown" ? timer.durationMs - el : el;
  const over = timer.kind === "countdown" && shown <= 0;
  useEffect(() => {
    if (over && timer.running && !warned.current) {
      warned.current = true;
      toast.warning("Time's up!");
    }
    if (!over) warned.current = false;
  }, [over, timer.running]);

  const reset = (patch: Partial<TimerState> = {}) =>
    onChange({ ...timer, running: false, startedAt: null, accumulatedMs: 0, ...patch });

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background px-1">
      <Select disabled={disabled} value={timer.kind} onValueChange={(v) => reset({ kind: v as TimerState["kind"] })}>
        <SelectTrigger className="h-8 w-[118px] border-0 shadow-none" aria-label="Timer type"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="stopwatch">Stopwatch</SelectItem>
          <SelectItem value="countdown">Countdown</SelectItem>
        </SelectContent>
      </Select>
      {timer.kind === "countdown" && (
        <Select disabled={disabled} value={String(timer.durationMs / 60000)} onValueChange={(v) => reset({ durationMs: Number(v) * 60000 })}>
          <SelectTrigger className="h-8 w-[84px] border-0 shadow-none" aria-label="Countdown length"><SelectValue /></SelectTrigger>
          <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
        </Select>
      )}
      <span aria-label="Time remaining" className={`min-w-16 text-center font-mono text-base font-bold tabular-nums ${over ? "text-destructive" : "text-accent"}`}>
        {formatMs(shown)}
      </span>
      <Button
        size="icon" variant="ghost" className="h-8 w-8"
        aria-label={timer.running ? "Pause timer" : "Start timer"}
        disabled={disabled}
        onClick={() =>
          timer.running
            ? onChange({ ...timer, running: false, startedAt: null, accumulatedMs: elapsedMs(timer) })
            : onChange({ ...timer, running: true, startedAt: Date.now() })
        }
      >
        {timer.running ? <Pause /> : <Play />}
      </Button>
      <Button disabled={disabled} size="icon" variant="ghost" className="h-8 w-8" aria-label="Reset timer" onClick={() => reset()}><RotateCcw /></Button>
    </div>
  );
}
