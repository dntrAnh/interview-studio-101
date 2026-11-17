import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSessionUser } from "@/lib/session-context";

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

const steps = [
  { n: "01", title: "Add a question", text: "Write your own, or paste one from LeetCode or HackerRank. AI can tidy the wording, format it like a real interview prompt, and suggest hints and time/space complexity." },
  { n: "02", title: "Open a room", text: "Practice solo, or start a mock interview and send the invite link to a friend. The question sits on the left, the code editor on the right." },
  { n: "03", title: "Code against the clock", text: "Pick a countdown or a stopwatch. Run your code in your language of choice against the question's test cases. The interviewer decides when hints are shown." },
  { n: "04", title: "Save a snapshot", text: "Freeze the question, code, output, timer and who was there into a read-only record you can review later from your dashboard." },
];

function Landing() {
  const user = useSessionUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <AppHeader signedIn={false}>
        <div className="ml-auto" />
        <Button asChild variant="ghost" size="sm"><Link to={user ? "/dashboard" : "/auth"}>{user ? "Go to Dashboard" : "Sign in"}</Link></Button>
      </AppHeader>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl font-bold">How it works</h1>
        <ol className="mt-10 space-y-10">
          {steps.map((st) => (
            <li key={st.n} className="grid grid-cols-[3rem_1fr] gap-4">
              <span className="font-mono text-sm text-primary">{st.n}</span>
              <div>
                <h2 className="font-display text-lg font-semibold">{st.title}</h2>
                <p className="mt-1 text-muted-foreground">{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-12"><Link to="/auth">Get started</Link></Button>
      </main>
    </div>
  );
}
