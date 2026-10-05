import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtTime, useScheduler } from "@/lib/scheduler-store";

const LEVELS = ["INFO", "WARN", "ERROR"] as const;
const levelTone = { INFO: "text-info", WARN: "text-warning", ERROR: "text-destructive" };

export function RunHistory({ scheduleId, initialRun }: { scheduleId?: string; initialRun?: string }) {
  const allRuns = useScheduler((s) => s.runs);
  const schedules = useScheduler((s) => s.schedules);
  const runs = useMemo(() => (scheduleId ? allRuns.filter((r) => r.scheduleId === scheduleId) : allRuns), [allRuns, scheduleId]);
  const [selected, setSelected] = useState(initialRun ?? runs[0]?.id);
  const [levels, setLevels] = useState<string[]>([...LEVELS]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const run = runs.find((r) => r.id === selected) ?? runs[0];
  const name = (id: string) => schedules.find((s) => s.id === id)?.name ?? id;
  const lines = run?.logs.filter((l) => levels.includes(l.level)) ?? [];

  const download = () => {
    if (!run) return;
    const text = run.logs.map((l) => `${new Date(l.ts).toISOString()} [${l.level}] ${l.msg}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${name(run.scheduleId)}_${run.id}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader><CardTitle className="text-base">Runs</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Run ID</TableHead>
                {!scheduleId && <TableHead>Job</TableHead>}
                <TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead className="pr-6">Trigger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.slice(0, 40).map((r) => (
                <TableRow key={r.id} onClick={() => setSelected(r.id)} className={cn("cursor-pointer", r.id === run?.id && "bg-accent/60 hover:bg-accent/60")}
                  tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelected(r.id)} aria-selected={r.id === run?.id}>
                  <TableCell className="pl-6 font-mono text-xs">{r.id}</TableCell>
                  {!scheduleId && <TableCell className="font-mono text-sm">{name(r.scheduleId)}</TableCell>}
                  <TableCell className="text-sm">{fmtTime(r.start)}</TableCell>
                  <TableCell className="text-sm">{fmtTime(r.end)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmtDuration((r.end ?? now) - r.start)}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="pr-6"><Badge variant="outline">{r.trigger}</Badge></TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No runs yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Logs {run && <span className="font-mono text-xs text-muted-foreground">{run.id}</span>}</CardTitle>
          <div className="flex items-center gap-1">
            {LEVELS.map((l) => (
              <Button key={l} size="sm" variant={levels.includes(l) ? "secondary" : "ghost"} className="h-7 px-2 text-xs" aria-pressed={levels.includes(l)}
                onClick={() => setLevels((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}>{l}</Button>
            ))}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={download} aria-label="Download log"><Download className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[28rem] overflow-auto rounded-md bg-sidebar p-3 font-mono text-xs leading-relaxed text-sidebar-foreground" role="log" aria-live="polite">
            {lines.map((l, i) => (
              <div key={i}>
                <span className="text-sidebar-foreground/50">{new Date(l.ts).toLocaleTimeString()}</span>{" "}
                <span className={levelTone[l.level]}>[{l.level}]</span> {l.msg}
              </div>
            ))}
            {run?.status === "Running" && <div className="animate-pulse text-sidebar-primary">▍ streaming…</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
