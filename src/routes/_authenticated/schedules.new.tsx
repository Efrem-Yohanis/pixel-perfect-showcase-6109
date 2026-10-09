import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScheduleWizard } from "@/components/schedule-wizard";
import { newSchedule } from "@/lib/scheduler-store";

export const Route = createFileRoute("/_authenticated/schedules/new")({
  head: () => ({
    meta: [
      { title: "New Schedule — Cadence Scheduler" },
      { name: "description", content: "Create a new scheduled Python, SQL or Shell job." },
      { property: "og:title", content: "New Schedule — Cadence Scheduler" },
      { property: "og:description", content: "Create a new scheduled job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewSchedule,
});

function NewSchedule() {
  const [initial] = useState(newSchedule);
  return <ScheduleWizard initial={initial} isNew />;
}
