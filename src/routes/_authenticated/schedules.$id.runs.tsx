import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Pencil, Play, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RunHistory } from "@/components/run-history";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { actions, cronToHuman, fmtTime, useScheduler } from "@/lib/scheduler-store";
import { NotFound } from "./schedules.$id.edit";

export const Route = createFileRoute("/_authenticated/schedules/$id/runs")({
  validateSearch: z.object({ run: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Job Details — Cadence Scheduler" },
      { name: "description", content: "Schedule configuration, run history and live logs for a job." },
      { property: "og:title", content: "Job Details — Cadence Scheduler" },
      { property: "og:description", content: "Schedule configuration, run history and live logs for a job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Runs,
});

function Runs() {
  const { id } = Route.useParams();
  const { run } = Route.useSearch();
  const s = useScheduler((st) => st.schedules.find((x) => x.id === id));
  const [confirm, setConfirm] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  if (!s) return <NotFound />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h1 className="break-all font-mono text-2xl font-semibold">{s.name}</h1><StatusBadge status={s.status} /></div>
          <p className="text-sm text-muted-foreground">{s.type} · {cronToHuman(s.cron)} · <span className="font-mono">{s.cron}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/schedules/$id/edit" params={{ id }}><Pencil className="h-4 w-4" /> Edit</Link></Button>
          <Button onClick={() => setConfirm(true)}><Play className="h-4 w-4" /> Run now</Button>
        </div>
      </div>
      <section className="border-y py-3">
        <Button variant="ghost" className="h-auto w-full justify-between px-0 py-2 hover:bg-transparent" aria-expanded={detailsOpen} aria-controls="schedule-details" onClick={() => setDetailsOpen((v) => !v)}>
          Schedule Details {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {detailsOpen && <div id="schedule-details" className="space-y-4 py-3">
          {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Owner", s.owner], ["Priority", s.priority], ["Tags", s.tags.join(", ") || "—"], ["Task type", s.type],
              ["Schedule type", s.scheduleType], ["Timing", s.scheduleType === "Manual" ? "Manual only" : `${cronToHuman(s.cron)} (${s.cron})`],
              ["Timezone", s.timezone], ["Next run", fmtTime(s.nextRun)], ["Last run", fmtTime(s.lastRun)],
              ["Start date", s.startDate || "—"], ["End date", s.endDate || "—"], ["Catchup", s.catchup ? "Yes" : "No"],
              ["Connection", s.connection || "—"], ["Retries", `${s.retries} × ${s.retryDelay}s`], ["Timeout", `${s.timeout}s`], ["On failure", s.onFailure],
              ["Email on success", s.emailOnSuccess ? "Yes" : "No"], ["Email on failure", s.emailOnFailure ? "Yes" : "No"],
              ["Recipients", s.recipients || "—"], ["Webhook", s.webhook || "—"],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
          </dl>
          {s.args.length > 0 && <div><h3 className="mb-2 text-sm font-medium">Arguments</h3><dl className="text-sm">{s.args.map((arg, i) => <div key={i} className="flex flex-wrap gap-2"><dt className="font-mono">{arg.key}</dt><dd className="break-all text-muted-foreground">{arg.value}</dd></div>)}</dl></div>}
          <div><h3 className="mb-2 text-sm font-medium">Code</h3><pre className="max-h-64 overflow-auto rounded-md bg-sidebar p-4 font-mono text-xs text-sidebar-foreground">{s.code || "No code configured."}</pre></div>
        </div>}
      </section>
      <h2 className="text-base font-semibold">Run History</h2>
      <RunHistory key={id} scheduleId={id} initialRun={run} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Run ${s.name} now?`} description="This triggers an immediate manual run." confirmText="Run now"
        onConfirm={() => { actions.runNow(id); setConfirm(false); toast.success(`Triggered ${s.name}`); }} />
    </div>
  );
}
