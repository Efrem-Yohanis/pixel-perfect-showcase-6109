import { createFileRoute } from "@tanstack/react-router";
import { UpcomingSchedulesPage } from "@/components/schedules-page";

export const Route = createFileRoute("/_authenticated/schedules/upcoming")({
  head: () => ({
    meta: [
      { title: "Safaricom | Upcoming Schedules" },
      { name: "description", content: "View the next planned run for every active schedule." },
      { property: "og:title", content: "Safaricom | Upcoming Schedules" },
      {
        property: "og:description",
        content: "View the next planned run for every active schedule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UpcomingSchedulesPage,
});
