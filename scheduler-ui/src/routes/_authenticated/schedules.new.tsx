import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ScheduleWizard } from "@/components/schedule-wizard";
import { newSchedule } from "@/lib/scheduler-store";

export const Route = createFileRoute("/_authenticated/schedules/new")({
  head: () => ({
    meta: [
      { title: "Safaricom | New Schedule" },
      { name: "description", content: "Create a scheduled Python or SQL job." },
      { property: "og:title", content: "Safaricom | New Schedule" },
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
