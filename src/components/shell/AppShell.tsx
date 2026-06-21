import { useCallback, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/shell/BottomNav";
import { SidebarNav } from "@/components/shell/SidebarNav";
import { TopHeader } from "@/components/shell/TopHeader";
import { P } from "@/theme/palette";

const SIDEBAR_KEY = "carbontrail_sidebar_collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === "1";
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: P.cream }}>
      <SidebarNav collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 pb-20 lg:pb-6">{children ?? <Outlet />}</main>
      </div>
      <BottomNav />
    </div>
  );
}
