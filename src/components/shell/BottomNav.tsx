import { NavLink } from "react-router-dom";
import { P } from "@/theme/palette";

const MOBILE_NAV = [
  { to: "/today", label: "Today", emoji: "🌿" },
  { to: "/history", label: "History", emoji: "📜" },
  { to: "/profile", label: "Profile", emoji: "👤" },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t px-1 py-1 lg:hidden"
      style={{ background: "rgba(245,240,232,0.95)", borderColor: P.border }}
      aria-label="Mobile navigation"
    >
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex flex-1 flex-col items-center rounded-lg py-2 text-xs"
          style={({ isActive }) => ({ color: isActive ? P.green : P.mutedText })}
        >
          <span aria-hidden="true" className="text-base">
            {item.emoji}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
