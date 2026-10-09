import { createFileRoute } from "@tanstack/react-router";
import { RunHistory } from "@/components/run-history";

export const Route = createFileRoute("/_authenticated/runs")({
  head: () => ({
    meta: [
      { title: "All Runs — Cadence Scheduler" },
      { name: "description", content: "Every run across all schedules with logs." },
      { property: "og:title", content: "All Runs — Cadence Scheduler" },
      { property: "og:description", content: "Every run across all schedules with logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Run History</h1>
        <p className="text-sm text-muted-foreground">All runs across every schedule. Select one to see its logs.</p>
      </div>
      <RunHistory />
    </div>
  ),
});
