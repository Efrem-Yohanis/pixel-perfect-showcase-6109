import { createFileRoute, Link } from "@tanstack/react-router";
import { ScheduleWizard } from "@/components/schedule-wizard";
import { useScheduler } from "@/lib/scheduler-store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/schedules/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Schedule — Cadence Scheduler" },
      { name: "description", content: "Update a scheduled job's timing, task and notifications." },
      { property: "og:title", content: "Edit Schedule — Cadence Scheduler" },
      { property: "og:description", content: "Update a scheduled job." },
    ],
  }),
  component: EditSchedule,
});

function EditSchedule() {
  const { id } = Route.useParams();
  const s = useScheduler((st) => st.schedules.find((x) => x.id === id));
  if (!s) return <NotFound />;
  return <ScheduleWizard key={id} initial={s} isNew={false} />;
}

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-medium">Schedule not found</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/schedules">Back to schedules</Link></Button>
    </div>
  );
}
