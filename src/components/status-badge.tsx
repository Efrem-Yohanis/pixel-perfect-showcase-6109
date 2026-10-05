import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Success: "bg-success/15 text-success",
  Active: "bg-success/15 text-success",
  Failed: "bg-destructive/15 text-destructive",
  Running: "bg-info/15 text-info",
  Queued: "bg-warning/20 text-foreground",
  Paused: "bg-muted text-muted-foreground",
  Draft: "bg-secondary text-secondary-foreground",
};
const dots: Record<string, string> = {
  Success: "bg-success", Active: "bg-success", Failed: "bg-destructive", Running: "bg-info animate-pulse",
  Queued: "bg-warning", Paused: "bg-muted-foreground", Draft: "bg-muted-foreground",
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      <span className={cn("status-dot", dots[status])} aria-hidden />
      {status}
    </span>
  );
}
