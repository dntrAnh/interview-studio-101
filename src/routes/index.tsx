import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Camera, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Interview Studio — practice coding interviews" },
      { name: "description", content: "Question on the left, editor on the right. Practice solo with a timer or run mock interviews with friends." },
      { property: "og:title", content: "Interview Studio — practice coding interviews" },
      { property: "og:description", content: "Question on the left, editor on the right. Practice solo or run mock interviews with friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, title: "Mock interviews", text: "Share a link. Code together live with cursors, synced timer and hints." },
  { icon: Clock, title: "Countdown or stopwatch", text: "Train under pressure solo, or keep time during a mock round." },
  { icon: Sparkles, title: "AI question help", text: "Import from LeetCode or HackerRank, reformat, and generate hints and complexity." },
  { icon: Camera, title: "Snapshots", text: "Freeze the question, code, output and timer into a read-only record." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader signedIn={false}>
        <div className="ml-auto" />
        <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
      </AppHeader>
      <main className="bg-grid">
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="font-mono text-sm text-primary">$ interview --mode=practice</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            The question on the left.<br />Your code on the right.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A focused room for coding interview practice — alone against the clock, or live with a friend playing interviewer.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/auth">Start practicing</Link></Button>
          </div>
          <div className="mt-16 overflow-hidden rounded-lg border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b bg-panel px-4 py-2 font-mono text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span className="ml-3">two-sum · mock interview</span>
              <span className="ml-auto text-accent">⏱ 24:13</span>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="space-y-3 border-b p-6 text-sm md:border-b-0 md:border-r">
                <p className="font-display text-lg font-semibold">1. Two Sum <span className="ml-2 rounded bg-success/15 px-2 py-0.5 text-xs text-success">Easy</span></p>
                <p className="text-muted-foreground">Given an array of integers and a target, return the indices of the two numbers that add up to the target.</p>
                <p className="font-mono text-xs text-muted-foreground">Input: nums = [2,7,11,15], target = 9<br />Output: [0,1]</p>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-6 text-foreground"><code>{`def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`}</code></pre>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-px overflow-hidden border-y bg-border md:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="bg-background p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-display font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
        <div className="h-20" />
      </main>
    </div>
  );
}
