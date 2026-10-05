import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { actions, cronToHuman, CRON_PRESETS, CONNECTIONS, OWNERS, useScheduler, type Schedule } from "@/lib/scheduler-store";

const STEPS = ["Basic Info", "Schedule", "Task", "Notifications", "Review"];
const TIMEZONES = ["UTC", "Africa/Nairobi", "Europe/London", "America/New_York", "Asia/Singapore"];
const CRON_FIELDS = ["Minute", "Hour", "Day", "Month", "Weekday"];
const REPO_FILES: Record<string, string[]> = {
  Python: ["/python/sales_etl.py", "/python/churn_model.py", "/python/invoice_export.py"],
  SQL: ["/sql/inventory_snapshot.sql", "/sql/kpi_refresh.sql", "/sql/dedupe_contacts.sql"],
  Shell: ["/shell/backup.sh", "/shell/cleanup_logs.sh"],
};

export function ScheduleWizard({ initial, isNew }: { initial: Schedule; isNew: boolean }) {
  const navigate = useNavigate();
  const existing = useScheduler((s) => s.schedules);
  const [s, setS] = useState<Schedule>(initial);
  const [step, setStep] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [codeMode, setCodeMode] = useState<"paste" | "repo">("paste");
  const up = <K extends keyof Schedule>(k: K, v: Schedule[K]) => setS((x) => ({ ...x, [k]: v }));

  const nameTaken = existing.some((x) => x.id !== s.id && x.name === s.name.trim());
  const cronParts = s.cron.split(/\s+/);
  const errors: Record<number, string | null> = {
    0: !s.name.trim() ? "Name is required" : nameTaken ? "Name must be unique" : null,
    1: s.scheduleType !== "Manual" && cronParts.length !== 5 ? "Cron expression needs 5 fields" : null,
    2: !s.code.trim() ? "Provide code or select a file" : s.type === "SQL" && !s.connection ? "Select a connection" : null,
  };

  const next = () => {
    if (errors[step]) { toast.error(errors[step]!); return; }
    setStep((x) => Math.min(x + 1, STEPS.length - 1));
  };

  const save = (status: Schedule["status"]) => {
    const firstErr = Object.entries(errors).find(([, e]) => e);
    if (firstErr && status !== "Draft") { setStep(+firstErr[0]); toast.error(firstErr[1]!); return; }
    if (!s.name.trim()) { setStep(0); toast.error("Name is required"); return; }
    actions.save({ ...s, name: s.name.trim(), status, nextRun: status === "Active" && s.scheduleType !== "Manual" ? Date.now() + 3600_000 : undefined });
    toast.success(status === "Draft" ? "Saved as draft" : `Schedule ${isNew ? "created" : "updated"}`);
    navigate({ to: "/schedules" });
  };

  const setCronPart = (i: number, v: string) => {
    const p = [...cronParts]; while (p.length < 5) p.push("*");
    p[i] = v || "*"; up("cron", p.join(" "));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "New Schedule" : `Edit ${initial.name}`}</h1>
      </div>

      <ol className="flex items-center gap-2" aria-label="Wizard steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              onClick={() => (i < step || !errors[step]) && setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary text-primary" : "text-muted-foreground")}
            >{i < step ? <Check className="h-4 w-4" /> : i + 1}</button>
            <span className={cn("hidden text-sm md:inline", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="space-y-5 p-6">
          {step === 0 && (
            <>
              <Field label="Name *" id="name" error={s.name && nameTaken ? "Name must be unique" : undefined}>
                <Input id="name" className="font-mono" placeholder="daily_sales_etl" value={s.name} onChange={(e) => up("name", e.target.value)} />
              </Field>
              <Field label="Description" id="desc"><Textarea id="desc" value={s.description} onChange={(e) => up("description", e.target.value)} /></Field>
              <Field label="Tags" id="tags">
                <div className="flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">{t}
                      <button aria-label={`Remove ${t}`} onClick={() => up("tags", s.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <Input id="tags" className="w-40" placeholder="Add tag + Enter" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); if (!s.tags.includes(tagInput.trim())) up("tags", [...s.tags, tagInput.trim()]); setTagInput(""); } }} />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Owner / Team" id="owner"><Pick id="owner" value={s.owner} onChange={(v) => up("owner", v)} options={OWNERS} /></Field>
                <Field label="Priority" id="prio"><Pick id="prio" value={s.priority} onChange={(v) => up("priority", v as Schedule["priority"])} options={["Low", "Medium", "High"]} /></Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Schedule type" id="stype">
                <Segmented value={s.scheduleType} onChange={(v) => up("scheduleType", v as Schedule["scheduleType"])} options={["Cron", "Interval", "Manual"]} />
              </Field>
              {s.scheduleType !== "Manual" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {CRON_PRESETS.map((p) => (
                      <Button key={p.cron} type="button" size="sm" variant={s.cron === p.cron ? "default" : "outline"} onClick={() => up("cron", p.cron)}>{p.label}</Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {CRON_FIELDS.map((f, i) => (
                      <div key={f} className="space-y-1">
                        <Label htmlFor={`cron-${i}`} className="text-xs text-muted-foreground">{f}</Label>
                        <Input id={`cron-${i}`} className="text-center font-mono" value={cronParts[i] ?? "*"} onChange={(e) => setCronPart(i, e.target.value.trim())} />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="font-mono text-sm">{s.cron}</p>
                    <p className="text-sm text-muted-foreground">{cronToHuman(s.cron)}</p>
                  </div>
                </>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Timezone" id="tz"><Pick id="tz" value={s.timezone} onChange={(v) => up("timezone", v)} options={TIMEZONES} /></Field>
                <Field label="Start date" id="sd"><Input id="sd" type="date" value={s.startDate ?? ""} onChange={(e) => up("startDate", e.target.value)} /></Field>
                <Field label="End date" id="ed"><Input id="ed" type="date" value={s.endDate ?? ""} onChange={(e) => up("endDate", e.target.value)} /></Field>
              </div>
              <Toggle id="catchup" label="Catchup" hint="Backfill missed runs since start date" checked={s.catchup} onChange={(v) => up("catchup", v)} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Task type" id="ttype">
                <Segmented value={s.type} onChange={(v) => up("type", v as Schedule["type"])} options={["Python", "SQL", "Shell"]} />
              </Field>
              {s.type === "SQL" && (
                <Field label="Connection *" id="conn"><Pick id="conn" value={s.connection ?? ""} onChange={(v) => up("connection", v)} options={CONNECTIONS} placeholder="Choose a connection" /></Field>
              )}
              <Field label="Source" id="src">
                <Segmented value={codeMode === "paste" ? "Paste code" : "Central repo"} onChange={(v) => setCodeMode(v === "Paste code" ? "paste" : "repo")} options={["Paste code", "Central repo"]} />
              </Field>
              {codeMode === "repo" && (
                <Pick id="repo" value="" placeholder="Select a file" options={REPO_FILES[s.type]} onChange={(f) => up("code", `# loaded from ${f}\n` + (s.type === "SQL" ? "SELECT 1;" : s.type === "Shell" ? "echo run" : "def main():\n    pass"))} />
              )}
              <Textarea aria-label="Code editor" spellCheck={false} className="min-h-56 bg-sidebar font-mono text-sm text-sidebar-foreground" value={s.code} onChange={(e) => up("code", e.target.value)}
                placeholder={s.type === "SQL" ? "SELECT ..." : s.type === "Shell" ? "#!/bin/bash" : "def main():"} />
              {s.type === "Python" && (
                <Field label="Arguments" id="args">
                  <div className="space-y-2">
                    {s.args.map((a, i) => (
                      <div key={i} className="flex gap-2">
                        <Input aria-label="Argument key" placeholder="key" className="font-mono" value={a.key} onChange={(e) => up("args", s.args.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                        <Input aria-label="Argument value" placeholder="value" className="font-mono" value={a.value} onChange={(e) => up("args", s.args.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                        <Button variant="ghost" size="icon" aria-label="Remove argument" onClick={() => up("args", s.args.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => up("args", [...s.args, { key: "", value: "" }])}><Plus className="h-4 w-4" /> Add argument</Button>
                  </div>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Retries" id="ret"><Input id="ret" type="number" min={0} value={s.retries} onChange={(e) => up("retries", +e.target.value)} /></Field>
                <Field label="Retry delay (s)" id="rd"><Input id="rd" type="number" min={0} value={s.retryDelay} onChange={(e) => up("retryDelay", +e.target.value)} /></Field>
                <Field label="Timeout (s)" id="to"><Input id="to" type="number" min={1} value={s.timeout} onChange={(e) => up("timeout", +e.target.value)} /></Field>
                <Field label="On failure" id="of"><Pick id="of" value={s.onFailure} onChange={(v) => up("onFailure", v as Schedule["onFailure"])} options={["Notify", "Retry", "Stop"]} /></Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Toggle id="eos" label="Email on success" checked={s.emailOnSuccess} onChange={(v) => up("emailOnSuccess", v)} />
              <Toggle id="eof" label="Email on failure" checked={s.emailOnFailure} onChange={(v) => up("emailOnFailure", v)} />
              <Field label="Slack / Teams webhook" id="wh"><Input id="wh" placeholder="https://hooks.slack.com/..." value={s.webhook} onChange={(e) => up("webhook", e.target.value)} /></Field>
              <Field label="Recipients" id="rcp"><Input id="rcp" placeholder="ops@company.com, data@company.com" value={s.recipients} onChange={(e) => up("recipients", e.target.value)} /></Field>
            </>
          )}

          {step === 4 && (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Name", s.name || "—"], ["Owner", s.owner], ["Priority", s.priority], ["Tags", s.tags.join(", ") || "—"],
                ["Schedule", s.scheduleType === "Manual" ? "Manual only" : `${cronToHuman(s.cron)} (${s.cron})`], ["Timezone", s.timezone],
                ["Catchup", s.catchup ? "Yes" : "No"], ["Task", s.type + (s.connection && s.type === "SQL" ? ` · ${s.connection}` : "")],
                ["Retries", `${s.retries} × ${s.retryDelay}s`], ["Timeout", `${s.timeout}s`], ["On failure", s.onFailure],
                ["Notify", [s.emailOnSuccess && "success", s.emailOnFailure && "failure"].filter(Boolean).join(" & ") || "None"],
              ].map(([k, v]) => (
                <div key={k} className="border-b pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
              <div className="sm:col-span-2"><dt className="mb-1 text-muted-foreground">Code</dt><pre className="max-h-40 overflow-auto rounded-md bg-sidebar p-3 font-mono text-xs text-sidebar-foreground">{s.code || "—"}</pre></div>
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => (step === 0 ? navigate({ to: "/schedules" }) : setStep(step - 1))}>
          <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Next <ChevronRight className="h-4 w-4" /></Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => save("Draft")}>Save as Draft</Button>
            <Button variant="secondary" onClick={() => save(initial.status === "Draft" ? "Paused" : initial.status)}>Save</Button>
            <Button onClick={() => save("Active")}>Save & Activate</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Pick({ id, value, onChange, options, placeholder }: { id: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div role="radiogroup" className="inline-flex rounded-md border bg-muted p-1">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={value === o} onClick={() => onChange(o)}
          className={cn("rounded px-3 py-1.5 text-sm transition-colors", value === o ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{o}</button>
      ))}
    </div>
  );
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div><Label htmlFor={id}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
