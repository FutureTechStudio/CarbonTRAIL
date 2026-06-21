import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { P } from "@/theme/palette";

type SidebarToggleButtonProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: "edge" | "inline";
};

export function SidebarToggleButton({
  collapsed,
  onToggle,
  variant = "inline",
}: SidebarToggleButtonProps) {
  const label = collapsed ? "Open sidebar" : "Collapse sidebar";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  if (variant === "edge") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        title={label}
        className="absolute -right-3.5 top-5 z-50 hidden h-8 w-8 items-center justify-center rounded-full border shadow-md transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:flex"
        style={{
          background: P.card,
          borderColor: P.border,
          color: P.charcoal,
          outlineColor: P.green,
        }}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: P.border, color: P.charcoal, outlineColor: P.green, background: "rgba(255,255,255,0.7)" }}
    >
      <Icon size={15} aria-hidden="true" />
      {collapsed ? "Open menu" : "Collapse menu"}
    </button>
  );
}
