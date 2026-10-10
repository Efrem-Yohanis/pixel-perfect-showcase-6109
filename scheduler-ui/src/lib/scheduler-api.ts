import type { Run, Schedule } from "@/lib/scheduler-store";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : `Scheduler API request failed (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const schedulerApi = {
  listSchedules: () => request<Schedule[]>("schedules/"),
  listRuns: (scheduleId?: string) =>
    request<Run[]>(scheduleId ? `schedules/${encodeURIComponent(scheduleId)}/runs/` : "runs/"),
  getLogs: (scheduleId: string, runId: string) =>
    request<Run["logs"]>(
      `schedules/${encodeURIComponent(scheduleId)}/runs/${encodeURIComponent(runId)}/logs/`,
    ),
  saveSchedule: (schedule: Schedule, isNew: boolean) =>
    request<Schedule>(isNew ? "schedules/" : `schedules/${encodeURIComponent(schedule.id)}/`, {
      method: isNew ? "POST" : "PATCH",
      body: JSON.stringify(schedule),
    }),
  deleteSchedule: (scheduleId: string) =>
    request<void>(`schedules/${encodeURIComponent(scheduleId)}/`, { method: "DELETE" }),
  setPaused: (scheduleId: string, paused: boolean) =>
    request<Schedule>(`schedules/${encodeURIComponent(scheduleId)}/pause/`, {
      method: "POST",
      body: JSON.stringify({ paused }),
    }),
  runNow: (scheduleId: string) =>
    request<Run>(`schedules/${encodeURIComponent(scheduleId)}/runs/trigger/`, { method: "POST" }),
};
