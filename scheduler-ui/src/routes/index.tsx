import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/schedules" });
  },
  head: () => ({
    meta: [
      { title: "Safaricom | Home" },
      { name: "description", content: "Create, monitor and manage scheduled Python and SQL jobs." },
      { property: "og:title", content: "Safaricom | Home" },
      { property: "og:description", content: "Create, monitor and manage scheduled jobs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
