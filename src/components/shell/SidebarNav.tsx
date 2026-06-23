import { NavLink } from "react-router-dom";
import { CarbonTrailLogo } from "@/components/brand/CarbonTrailLogo";
import { SidebarProfileMenu } from "@/components/shell/SidebarProfileMenu";
import { SidebarToggleButton } from "@/components/shell/SidebarToggleButton";
import { P } from "@/theme/palette";

const DESKTOP_NAV = [
  { to: "/today", label: "Today", emoji: "🌿" },
  { to: "/history", label: "History", emoji: "📜" },
];

type SidebarNavProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden h-screen flex-col transition-[width] duration-200 ease-out lg:flex ${
        collapsed ? "w-[4.75rem]" : "w-64"
      }`}
      style={{ background: P.charcoal }}
      aria-label="Desktop navigation"
    >
      <SidebarToggleButton collapsed={collapsed} onToggle={onToggle} variant="edge" />

      <div className={`shrink-0 flex items-center ${collapsed ? "justify-center p-3 pt-5" : "gap-2 p-5"}`}>
        <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
          <CarbonTrailLogo size={collapsed ? "sm" : "md"} />
          {!collapsed ? (
            <div>
              <p className="text-sm font-bold text-white">CarbonTrail AI</p>
              <p className="text-xs text-green-200">Daily carbon trail</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className={`min-h-0 flex-1 overflow-y-auto pb-2 ${collapsed ? "px-2" : "px-3"}`}>
        {DESKTOP_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={`mb-1 flex items-center rounded-xl text-sm transition ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2"
            }`}
            style={({ isActive }) => ({
              background: isActive ? P.leaf : "transparent",
              color: isActive ? "#fff" : "#c8dfcf",
            })}
          >
            <span aria-hidden="true">{item.emoji}</span>
            {!collapsed ? item.label : null}
          </NavLink>
        ))}
      </nav>

      <SidebarProfileMenu collapsed={collapsed} />
    </aside>
  );
}
