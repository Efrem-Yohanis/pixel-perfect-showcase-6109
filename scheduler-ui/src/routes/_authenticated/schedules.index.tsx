import { createFileRoute } from "@tanstack/react-router";
import { SchedulesPage } from "@/components/schedules-page";

export const Route = createFileRoute("/_authenticated/schedules/")({
  head: () => ({
    meta: [
      { title: "Safaricom | Schedules" },
      { name: "description", content: "Manage all scheduled jobs, upcoming schedules, job details and logs." },
      { property: "og:title", content: "Safaricom | Schedules" },
      { property: "og:description", content: "Manage all scheduled jobs and upcoming runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulesPage,
});
