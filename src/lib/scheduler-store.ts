import { useSyncExternalStore } from "react";

export type TaskType = "Python" | "SQL" | "Shell";
export type ScheduleStatus = "Active" | "Paused" | "Failed" | "Draft";
export type RunStatus = "Success" | "Failed" | "Running" | "Queued";

export interface Schedule {
  id: string;
  name: string;
  description: string;
  tags: string[];
  owner: string;
  priority: "Low" | "Medium" | "High";
  scheduleType: "Cron" | "Interval" | "Manual";
  cron: string;
  timezone: string;
  startDate?: string;
  endDate?: string;
  catchup: boolean;
  type: TaskType;
  code: string;
  connection?: string;
  args: { key: string; value: string }[];
  retries: number;
  retryDelay: number;
  timeout: number;
  onFailure: "Notify" | "Retry" | "Stop";
  emailOnSuccess: boolean;
  emailOnFailure: boolean;
  webhook: string;
  recipients: string;
  status: ScheduleStatus;
  lastRun?: number;
  lastStatus?: RunStatus;
  nextRun?: number;
}

export interface Run {
  id: string;
  scheduleId: string;
  start: number;
  end?: number;
  status: RunStatus;
  trigger: "Scheduled" | "Manual";
  logs: { ts: number; level: "INFO" | "WARN" | "ERROR"; msg: string }[];
}

export const CONNECTIONS = ["warehouse_pg", "analytics_snowflake", "crm_mysql", "reporting_mssql"];
export const OWNERS = ["amina.k", "david.o", "grace.w", "peter.m"];

const MIN = 60_000;
const HOUR = 60 * MIN;

interface State {
  schedules: Schedule[];
  runs: Run[];
}

let state: State | null = null;
const listeners = new Set<() => void>();

function base(p: Partial<Schedule> & Pick<Schedule, "id" | "name" | "type" | "cron">): Schedule {
  return {
    description: "",
    tags: [],
    owner: OWNERS[0],
    priority: "Medium",
    scheduleType: "Cron",
    timezone: "Africa/Nairobi",
    catchup: false,
    code: "",
    args: [],
    retries: 2,
    retryDelay: 300,
    timeout: 3600,
    onFailure: "Notify",
    emailOnSuccess: false,
    emailOnFailure: true,
    webhook: "",
    recipients: "",
    status: "Active",
    ...p,
  };
}

function logsFor(name: string, start: number, failed: boolean): Run["logs"] {
  const l: Run["logs"] = [
    { ts: start, level: "INFO", msg: `Starting task ${name}` },
    { ts: start + 1500, level: "INFO", msg: "Resolving dependencies and connections" },
    { ts: start + 4000, level: "INFO", msg: "Executing main step" },
    { ts: start + 9000, level: "WARN", msg: "Slow response from upstream (2.3s)" },
  ];
  if (failed) {
    l.push({ ts: start + 15000, level: "ERROR", msg: "psycopg2.OperationalError: connection timed out" });
    l.push({ ts: start + 15200, level: "ERROR", msg: "Task failed after 2 retries" });
  } else {
    l.push({ ts: start + 20000, level: "INFO", msg: "Processed 12,480 rows" });
    l.push({ ts: start + 21000, level: "INFO", msg: "Task completed successfully" });
  }
  return l;
}

function seed(): State {
  const now = Date.now();
  const schedules: Schedule[] = [
    base({ id: "s1", name: "daily_sales_etl", type: "Python", cron: "0 2 * * *", owner: "amina.k", tags: ["etl", "sales"], priority: "High", description: "Load daily sales from POS into warehouse", code: "import pandas as pd\n\ndef main():\n    df = pd.read_csv('sales.csv')\n    print(len(df))\n" }),
    base({ id: "s2", name: "hourly_inventory_sync", type: "SQL", cron: "0 * * * *", owner: "david.o", tags: ["inventory"], connection: "warehouse_pg", code: "INSERT INTO inventory_snapshot\nSELECT * FROM inventory_live;" }),
    base({ id: "s3", name: "customer_churn_model", type: "Python", cron: "0 0 * * 1", owner: "grace.w", tags: ["ml"], status: "Failed" }),
    base({ id: "s4", name: "backup_reports_db", type: "Shell", cron: "30 3 * * *", owner: "peter.m", tags: ["ops", "backup"], code: "#!/bin/bash\npg_dump reports > /backups/reports.sql" }),
    base({ id: "s5", name: "marketing_kpi_refresh", type: "SQL", cron: "*/15 * * * *", owner: "amina.k", tags: ["marketing"], connection: "analytics_snowflake" }),
    base({ id: "s6", name: "monthly_invoice_export", type: "Python", cron: "0 6 1 * *", owner: "david.o", tags: ["finance"], status: "Paused", priority: "High" }),
    base({ id: "s7", name: "log_cleanup", type: "Shell", cron: "0 4 * * 0", owner: "peter.m", tags: ["ops"] }),
    base({ id: "s8", name: "crm_contacts_dedupe", type: "SQL", cron: "0 */6 * * *", owner: "grace.w", tags: ["crm"], connection: "crm_mysql" }),
  ];
  const nextOffsets = [6 * HOUR, 22 * MIN, 2 * 24 * HOUR, 9 * HOUR, 7 * MIN, 0, 3 * 24 * HOUR, 2 * HOUR];
  const runs: Run[] = [];
  let n = 1000;
  schedules.forEach((s, i) => {
    for (let k = 0; k < 5; k++) {
      const start = now - (k * 5 + i + 1) * HOUR - i * 7 * MIN;
      const failed = (i === 2 && k < 2) || (i + k) % 9 === 0;
      const dur = (2 + ((i * 3 + k * 7) % 25)) * MIN;
      runs.push({
        id: `r${n++}`,
        scheduleId: s.id,
        start,
        end: start + dur,
        status: failed ? "Failed" : "Success",
        trigger: k === 3 ? "Manual" : "Scheduled",
        logs: logsFor(s.name, start, failed),
      });
    }
    const latest = runs.filter((r) => r.scheduleId === s.id)[0];
    s.lastRun = latest.start;
    s.lastStatus = latest.status;
    s.nextRun = s.status === "Paused" ? undefined : now + nextOffsets[i];
  });
  // one running
  runs.unshift({ id: `r${n++}`, scheduleId: "s5", start: now - 3 * MIN, status: "Running", trigger: "Scheduled", logs: logsFor("marketing_kpi_refresh", now - 3 * MIN, false).slice(0, 3) });
  return { schedules, runs: runs.sort((a, b) => b.start - a.start) };
}

function get(): State {
  if (!state) state = seed();
  return state;
}

function set(fn: (s: State) => State) {
  state = fn(get());
  listeners.forEach((l) => l());
}

export function useScheduler<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(get()),
    () => sel(get()),
  );
}

export const actions = {
  save(s: Schedule) {
    set((st) => {
      const exists = st.schedules.some((x) => x.id === s.id);
      return { ...st, schedules: exists ? st.schedules.map((x) => (x.id === s.id ? s : x)) : [s, ...st.schedules] };
    });
  },
  remove(ids: string[]) {
    set((st) => ({ ...st, schedules: st.schedules.filter((s) => !ids.includes(s.id)), runs: st.runs.filter((r) => !ids.includes(r.scheduleId)) }));
  },
  setPaused(ids: string[], paused: boolean) {
    set((st) => ({
      ...st,
      schedules: st.schedules.map((s) =>
        ids.includes(s.id) ? { ...s, status: paused ? "Paused" : "Active", nextRun: paused ? undefined : Date.now() + HOUR } : s,
      ),
    }));
  },
  runNow(id: string) {
    const s = get().schedules.find((x) => x.id === id);
    if (!s) return;
    const start = Date.now();
    const run: Run = { id: `r${start}`, scheduleId: id, start, status: "Running", trigger: "Manual", logs: [{ ts: start, level: "INFO", msg: `Manual trigger for ${s.name}` }] };
    set((st) => ({ ...st, runs: [run, ...st.runs], schedules: st.schedules.map((x) => (x.id === id ? { ...x, lastRun: start, lastStatus: "Running" } : x)) }));
    const steps = logsFor(s.name, start, false).slice(1);
    steps.forEach((line, i) => {
      setTimeout(() => {
        set((st) => ({
          ...st,
          runs: st.runs.map((r) => {
            if (r.id !== run.id) return r;
            const done = i === steps.length - 1;
            return { ...r, logs: [...r.logs, { ...line, ts: Date.now() }], status: done ? "Success" : r.status, end: done ? Date.now() : undefined };
          }),
          schedules: i === steps.length - 1 ? st.schedules.map((x) => (x.id === id ? { ...x, lastStatus: "Success" } : x)) : st.schedules,
        }));
      }, (i + 1) * 1200);
    });
  },
};

export function newSchedule(): Schedule {
  return base({ id: `s${Date.now()}`, name: "", type: "Python", cron: "0 2 * * *", status: "Draft", owner: OWNERS[0] });
}

export const CRON_PRESETS = [
  { label: "Every 5 min", cron: "*/5 * * * *" },
  { label: "Hourly", cron: "0 * * * *" },
  { label: "Daily at 2 AM", cron: "0 2 * * *" },
  { label: "Weekly", cron: "0 0 * * 1" },
  { label: "Monthly", cron: "0 0 1 * *" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function cronToHuman(cron: string): string {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return "Invalid cron";
  const [m, h, dom, mon, dow] = p;
  const time = () => `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  if (m.startsWith("*/") && h === "*") return `Every ${m.slice(2)} minutes`;
  if (m === "*" && h === "*") return "Every minute";
  if (/^\d+$/.test(m) && h === "*") return `Hourly at :${m.padStart(2, "0")}`;
  if (/^\d+$/.test(m) && h.startsWith("*/")) return `Every ${h.slice(2)} hours`;
  if (/^\d+$/.test(m) && /^\d+$/.test(h)) {
    if (dom === "*" && mon === "*" && dow === "*") return `Daily at ${time()}`;
    if (dom === "*" && mon === "*" && /^\d$/.test(dow)) return `Weekly on ${DAYS[+dow]} at ${time()}`;
    if (/^\d+$/.test(dom) && mon === "*" && dow === "*") return `Monthly on day ${dom} at ${time()}`;
  }
  return "Custom schedule";
}

export function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtTime(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
