import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RunHistory } from "@/components/run-history";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { actions, cronToHuman, useScheduler } from "@/lib/scheduler-store";
import { NotFound } from "./schedules.$id.edit";

export const Route = createFileRoute("/_authenticated/schedules/$id/runs")({
  validateSearch: z.object({ run: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Run History — Cadence Scheduler" },
      { name: "description", content: "Run history and live logs for a scheduled job." },
      { property: "og:title", content: "Run History — Cadence Scheduler" },
      { property: "og:description", content: "Run history and live logs for a scheduled job." },
    ],
  }),
  component: Runs,
});

function Runs() {
  const { id } = Route.useParams();
  const { run } = Route.useSearch();
  const s = useScheduler((st) => st.schedules.find((x) => x.id === id));
  const [confirm, setConfirm] = useState(false);
  if (!s) return <NotFound />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3"><h1 className="font-mono text-2xl font-semibold tracking-tight">{s.name}</h1><StatusBadge status={s.status} /></div>
          <p className="text-sm text-muted-foreground">{s.type} · {cronToHuman(s.cron)} · <span className="font-mono">{s.cron}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/schedules/$id/edit" params={{ id }}><Pencil className="h-4 w-4" /> Edit</Link></Button>
          <Button onClick={() => setConfirm(true)}><Play className="h-4 w-4" /> Run now</Button>
        </div>
      </div>
      <RunHistory key={id} scheduleId={id} initialRun={run} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Run ${s.name} now?`} description="This triggers an immediate manual run." confirmText="Run now"
        onConfirm={() => { actions.runNow(id); setConfirm(false); toast.success(`Triggered ${s.name}`); }} />
    </div>
  );
}
