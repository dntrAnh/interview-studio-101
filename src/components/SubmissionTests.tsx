import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TestCase } from "@/lib/types";

export function SubmissionTests({ tests, onChange, disabled }: { tests: TestCase[]; onChange: (tests: TestCase[]) => void; disabled: boolean }) {
  return <section className="min-w-0 space-y-3 border-t pt-5" aria-label="Added edge cases">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-semibold">Added edge cases</h2><Button variant="outline" size="sm" disabled={disabled || tests.length >= 10} onClick={() => onChange([...tests, { input: "", expected: "" }])}><Plus />Add test</Button></div>
    {tests.map((test, index) => <div key={index} className="space-y-2 border-b pb-3">
      <div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">Edge case {index + 1}</span><Button size="icon" variant="ghost" title="Remove test" aria-label={`Remove edge case ${index + 1}`} disabled={disabled} onClick={() => onChange(tests.filter((_, i) => i !== index))}><Trash2 /></Button></div>
      <Textarea aria-label={`Edge case ${index + 1} input`} placeholder="stdin" value={test.input} disabled={disabled} className="min-h-16 font-mono text-xs" onChange={e => onChange(tests.map((t,i) => i === index ? { ...t, input: e.target.value } : t))} />
      <Textarea aria-label={`Edge case ${index + 1} expected output`} placeholder="expected stdout" value={test.expected} disabled={disabled} className="min-h-16 font-mono text-xs" onChange={e => onChange(tests.map((t,i) => i === index ? { ...t, expected: e.target.value } : t))} />
    </div>)}
  </section>;
}