import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Cadence Scheduler" },
      { name: "description", content: "Create, monitor and manage scheduled Python, SQL and Shell jobs." },
      { property: "og:title", content: "Cadence Scheduler" },
      { property: "og:description", content: "Create, monitor and manage scheduled jobs." },
    ],
  }),
});
