import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Play, Pause, PlayCircle, Trash2, FileText, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useScheduler, actions, cronToHuman, fmtTime, OWNERS, type Schedule } from "@/lib/scheduler-store";

export const Route = createFileRoute("/_authenticated/schedules/")({
  head: () => ({
    meta: [
      { title: "All Schedules — Cadence Scheduler" },
      { name: "description", content: "Search, filter and manage every scheduled job." },
      { property: "og:title", content: "All Schedules — Cadence Scheduler" },
      { property: "og:description", content: "Search, filter and manage every scheduled job." },
    ],
  }),
  component: SchedulesPage,
});

type SortKey = "name" | "nextRun" | "lastRun";
type Pending = { kind: "run" | "delete" | "bulkDelete"; items: Schedule[] } | null;

function SchedulesPage() {
  const schedules = useScheduler((s) => s.schedules);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [owner, setOwner] = useState("all");
  const [from, setFrom] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "name", asc: true });
  const [sel, setSel] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending>(null);

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    const fromTs = from ? new Date(from).getTime() : 0;
    return schedules
      .filter((s) => !term || s.name.toLowerCase().includes(term) || s.owner.includes(term) || s.tags.some((t) => t.includes(term)))
      .filter((s) => status === "all" || s.status === status)
      .filter((s) => type === "all" || s.type === type)
      .filter((s) => owner === "all" || s.owner === owner)
      .filter((s) => !fromTs || (s.lastRun ?? 0) >= fromTs)
      .sort((a, b) => {
        const av = a[sort.key] ?? Infinity, bv = b[sort.key] ?? Infinity;
        const c = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.asc ? c : -c;
      });
  }, [schedules, q, status, type, owner, from, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)} aria-label={`Sort by ${label}`}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "run") {
      actions.runNow(pending.items[0].id);
      toast.success(`Triggered ${pending.items[0].name}`);
    } else {
      const ids = pending.items.map((i) => i.id);
      actions.remove(ids);
      setSel((s) => s.filter((x) => !ids.includes(x)));
      toast.success(`Deleted ${ids.length} schedule${ids.length > 1 ? "s" : ""}`);
    }
    setPending(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Schedules</h1>
            <p className="text-sm text-muted-foreground">{rows.length} of {schedules.length} schedules</p>
          </div>
          <Button asChild><Link to="/schedules/new"><Plus className="h-4 w-4" /> New Schedule</Link></Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, owner, tag" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" aria-label="Search schedules" />
          </div>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={["Active", "Paused", "Failed", "Draft"]} />
          <FilterSelect label="Type" value={type} onChange={setType} options={["Python", "SQL", "Shell"]} />
          <FilterSelect label="Owner" value={owner} onChange={setOwner} options={OWNERS} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="Last run since" />
          {sel.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{sel.length} selected</span>
              <Button variant="outline" size="sm" onClick={() => { actions.setPaused(sel, true); toast.success(`Paused ${sel.length} schedules`); }}><Pause className="h-4 w-4" /> Pause</Button>
              <Button variant="destructive" size="sm" onClick={() => setPending({ kind: "bulkDelete", items: schedules.filter((s) => sel.includes(s.id)) })}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox aria-label="Select all" checked={allSel} onCheckedChange={(v) => setSel(v ? rows.map((r) => r.id) : [])} /></TableHead>
                <TableHead><SortBtn k="name" label="Name" /></TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><SortBtn k="lastRun" label="Last Run" /></TableHead>
                <TableHead><SortBtn k="nextRun" label="Next Run" /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} data-state={sel.includes(s.id) ? "selected" : undefined}>
                  <TableCell><Checkbox aria-label={`Select ${s.name}`} checked={sel.includes(s.id)} onCheckedChange={(v) => setSel((x) => (v ? [...x, s.id] : x.filter((i) => i !== s.id)))} /></TableCell>
                  <TableCell>
                    <Link to="/schedules/$id/edit" params={{ id: s.id }} className="font-mono text-sm font-medium hover:text-primary hover:underline">{s.name}</Link>
                    <div className="mt-1 flex gap-1">{s.tags.map((t) => <Badge key={t} variant="secondary" className="px-1.5 py-0 text-[10px]">{t}</Badge>)}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                  <TableCell>
                    <div className="text-sm">{s.scheduleType === "Manual" ? "Manual only" : cronToHuman(s.cron)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{s.cron}</div>
                  </TableCell>
                  <TableCell className="text-sm">{s.owner}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell><div className="text-sm">{fmtTime(s.lastRun)}</div>{s.lastStatus && <StatusBadge status={s.lastStatus} />}</TableCell>
                  <TableCell className="text-sm">{fmtTime(s.nextRun)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <IconAction label="Edit" asLink={<Link to="/schedules/$id/edit" params={{ id: s.id }}><Pencil className="h-4 w-4" /></Link>} />
                      <IconAction label="Run now" onClick={() => setPending({ kind: "run", items: [s] })}><Play className="h-4 w-4" /></IconAction>
                      <IconAction label={s.status === "Paused" ? "Resume" : "Pause"} onClick={() => { actions.setPaused([s.id], s.status !== "Paused"); toast.success(`${s.status === "Paused" ? "Resumed" : "Paused"} ${s.name}`); }}>
                        {s.status === "Paused" ? <PlayCircle className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </IconAction>
                      <IconAction label="View logs" asLink={<Link to="/schedules/$id/runs" params={{ id: s.id }}><FileText className="h-4 w-4" /></Link>} />
                      <IconAction label="Delete" onClick={() => setPending({ kind: "delete", items: [s] })}><Trash2 className="h-4 w-4 text-destructive" /></IconAction>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No schedules match your filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <ConfirmDialog
          open={!!pending}
          onOpenChange={(o) => !o && setPending(null)}
          title={pending?.kind === "run" ? `Run ${pending.items[0].name} now?` : `Delete ${pending?.items.length === 1 ? pending.items[0].name : `${pending?.items.length} schedules`}?`}
          description={pending?.kind === "run" ? "This triggers an immediate manual run outside the schedule." : "This permanently removes the schedule and its run history."}
          confirmText={pending?.kind === "run" ? "Run now" : "Delete"}
          destructive={pending?.kind !== "run"}
          typeToConfirm={pending?.kind === "delete" ? pending.items[0].name : pending?.kind === "bulkDelete" ? "DELETE" : undefined}
          onConfirm={confirm}
        />
      </div>
    </TooltipProvider>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32" aria-label={`Filter by ${label}`}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function IconAction({ label, onClick, children, asLink }: { label: string; onClick?: () => void; children?: React.ReactNode; asLink?: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {asLink ? <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label={label}>{asLink}</Button> : <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick} aria-label={label}>{children}</Button>}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
