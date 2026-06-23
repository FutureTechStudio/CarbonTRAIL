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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: P.cream }}>
      <SidebarNav collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div
        className={`flex min-h-screen min-w-0 w-full max-w-full flex-col transition-[padding] duration-200 ease-out ${
          sidebarCollapsed ? "lg:pl-[4.75rem]" : "lg:pl-64"
        }`}
      >
        <TopHeader />
        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden pb-20 lg:pb-6">
          {children ?? <Outlet />}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
