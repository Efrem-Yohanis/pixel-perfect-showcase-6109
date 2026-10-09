import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, XCircle, Clock, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useScheduler, fmtDuration, fmtTime, cronToHuman } from "@/lib/scheduler-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cadence Scheduler" },
      { name: "description", content: "Overview of schedules, recent runs and upcoming jobs." },
      { property: "og:title", content: "Dashboard — Cadence Scheduler" },
      { property: "og:description", content: "Overview of schedules, recent runs and upcoming jobs." },
    ],
  }),
  component: Dashboard,
});

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function countdown(ms: number) {
  if (ms <= 0) return "due";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function Dashboard() {
  const schedules = useScheduler((s) => s.schedules);
  const runs = useScheduler((s) => s.runs);
  const now = useNow();
  const dayStart = new Date(now).setHours(0, 0, 0, 0);
  const upcoming = schedules.filter((s) => s.nextRun).sort((a, b) => a.nextRun! - b.nextRun!).slice(0, 5);
  const name = (id: string) => schedules.find((s) => s.id === id)?.name ?? id;

  const stats = [
    { label: "Total Schedules", value: schedules.length, icon: CalendarClock, tone: "text-foreground" },
    { label: "Active", value: schedules.filter((s) => s.status === "Active").length, icon: CheckCircle2, tone: "text-success" },
    { label: "Failed Today", value: runs.filter((r) => r.status === "Failed" && r.start >= dayStart).length, icon: XCircle, tone: "text-destructive" },
    { label: "Upcoming Runs (24h)", value: schedules.filter((s) => s.nextRun && s.nextRun - now < 86400_000).length, icon: Clock, tone: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">What's running, what failed, what's next.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/schedules">All Schedules</Link></Button><Button asChild variant="outline"><Link to="/runs">Run History</Link></Button><Button asChild><Link to="/schedules/new"><Plus className="h-4 w-4" /> New Schedule</Link></Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`mt-1 text-3xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
              </div>
              <s.icon className={`h-6 w-6 ${s.tone}`} aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Runs</CardTitle></CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-6">Job</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead><TableHead>Duration</TableHead><TableHead className="pr-6 text-right">Logs</TableHead></TableRow></TableHeader>
              <TableBody>
                {runs.slice(0, 8).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6 font-mono text-sm">{name(r.scheduleId)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtTime(r.start)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{fmtDuration((r.end ?? now) - r.start)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/schedules/$id/runs" params={{ id: r.scheduleId }} search={{ run: r.id }} aria-label={`View logs for ${name(r.scheduleId)}`}><FileText className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((s) => (
              <Link key={s.id} to="/schedules/$id/edit" params={{ id: s.id }} className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{cronToHuman(s.cron)}</p>
                </div>
                <span className="rounded bg-accent px-2 py-1 font-mono text-xs tabular-nums text-accent-foreground">{countdown(s.nextRun! - now)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
