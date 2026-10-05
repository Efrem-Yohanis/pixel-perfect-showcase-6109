import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, CalendarClock, Plus, History, LogOut, Timer } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { logout } from "@/lib/auth";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "All Schedules", url: "/schedules", icon: CalendarClock },
  { title: "New Schedule", url: "/schedules/new", icon: Plus },
  { title: "Run History", url: "/runs", icon: History },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Timer className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Cadence</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Scheduler</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path === i.url} tooltip={i.title}>
                    <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={() => { logout(); navigate({ to: "/login", replace: true }); }}>
              <LogOut /><span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
