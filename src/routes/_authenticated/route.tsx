import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: Layout,
});

function Layout() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const user = getSession()?.user ?? "";

  useEffect(() => {
    setDark(localStorage.getItem("theme") === "dark");
    const t = setInterval(() => { if (!getSession()) navigate({ to: "/login", replace: true }); }, 30_000);
    return () => clearInterval(t);
  }, [navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <div className="flex-1" />
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-semibold uppercase text-accent-foreground">{user.slice(0, 1)}</div>
              <span className="hidden sm:inline text-muted-foreground">{user}</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
