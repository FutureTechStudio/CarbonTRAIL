import { P } from "@/theme/palette";
import type { DataStatus } from "@/types";

const MAP: Record<DataStatus, { label: string; bg: string; fg: string }> = {
  confirmed: { label: "Confirmed", bg: "#e6f6ed", fg: P.green },
  assumed: { label: "Assumed", bg: "#fff3e3", fg: P.amber },
  estimated_from_profile: { label: "Estimated", bg: "#efece8", fg: P.smoke },
  parsed_pending: { label: "Predicted", bg: "#eef5ff", fg: "#4066a8" },
};

export function StatusBadge({ status }: { status: DataStatus }) {
  const s = MAP[status];
  return (
    <span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
