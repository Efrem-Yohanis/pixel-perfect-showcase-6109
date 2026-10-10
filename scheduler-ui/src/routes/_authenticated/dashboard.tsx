import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Safaricom | Schedules" },
      { property: "og:title", content: "Safaricom | Schedules" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/schedules" });
  },
});
