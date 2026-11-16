import { Fragment } from "react";
import type { QuestionData } from "@/lib/types";

const diffClass: Record<string, string> = {
  Easy: "bg-success/15 text-success",
  Medium: "bg-warning/15 text-warning",
  Hard: "bg-destructive/15 text-destructive",
};

/** Renders plain-text question descriptions with light markdown: ### headings, bullets, `code`. */
export function QuestionView({ q }: { q: QuestionData }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-semibold">{q.title || "Untitled question"}</h1>
        <span className={`rounded px-2 py-0.5 font-mono text-xs ${diffClass[q.difficulty] ?? "bg-muted"}`}>{q.difficulty}</span>
      </div>
      <RichText text={q.description || "No description."} />
    </div>
  );
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("### ") || line.startsWith("## "))
          return <h3 key={i} className="pt-3 font-display font-semibold">{line.replace(/^#+\s/, "")}</h3>;
        if (/^\s*[-*]\s/.test(line))
          return <p key={i} className="pl-4 before:mr-2 before:text-primary before:content-['›']"><Inline text={line.replace(/^\s*[-*]\s/, "")} /></p>;
        if (/^(Input|Output|Explanation):/.test(line))
          return <p key={i} className="rounded bg-muted px-2 py-1 font-mono text-xs"><Inline text={line} /></p>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}><Inline text={line} /></p>;
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") ? <code key={i} className="rounded bg-muted px-1 font-mono text-xs">{p.slice(1, -1)}</code>
        : p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
