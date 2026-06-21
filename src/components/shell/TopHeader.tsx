import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useGuest } from "@/app/providers";
import { CarbonTrailLogo } from "@/components/brand/CarbonTrailLogo";
import { buildTimeCheckpoints, reviewedCheckpointCount } from "@/features/today/dailyRingModel";
import { getDayStatusBadgeLabel } from "@/features/today/todayHelpers";
import type { DayStatus } from "@/types";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

const ROUTE_LABELS: Record<string, string> = {
  "/today": "Today",
  "/history": "History",
  "/forest": "Weekly Forest",
  "/valley": "Monthly Valley",
  "/profile": "Carbon Memory",
};

const MOBILE_TITLES: Record<string, string> = {
  "/today": "Today's Carbon Trail",
  "/history": "Carbon History",
  "/forest": "Weekly Forest",
  "/valley": "Monthly Valley",
  "/profile": "My Carbon Memory",
};

function HeaderBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "sky" | "green" | "amber";
}) {
  const styles = {
    neutral: { background: "rgba(255,255,255,0.72)", borderColor: P.border, color: P.mutedText },
    sky: { background: `${P.sky}22`, borderColor: `${P.sky}44`, color: P.charcoal },
    green: { background: `${P.green}16`, borderColor: `${P.green}44`, color: P.charcoal },
    amber: { background: `${P.amber}16`, borderColor: `${P.amber}44`, color: P.charcoal },
  }[tone];

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold lg:px-3 lg:py-1 lg:text-xs"
      style={styles}
    >
      {children}
    </span>
  );
}

function dayStatusTone(status: DayStatus): "green" | "amber" | "sky" {
  if (status === "confirmed") return "green";
  if (status === "auto_filled") return "amber";
  return "sky";
}

function TodayTrailBadges({ compact = false }: { compact?: boolean }) {
  const { todayDay } = useGuest();
  const dayStatus = todayDay?.status ?? "empty";
  const reviewed = reviewedCheckpointCount(buildTimeCheckpoints(todayDay?.activities ?? []));
  const dayConfidence = Math.round((todayDay?.totals.confidence ?? 0) * 100);
  const dayStatusLabel = getDayStatusBadgeLabel(dayStatus);

  return (
    <div className={`flex shrink-0 flex-wrap items-center justify-end gap-1.5 ${compact ? "" : "gap-2"}`}>
      <HeaderBadge tone="neutral">{reviewed} of 12 slots reviewed</HeaderBadge>
      <HeaderBadge tone="sky">{dayConfidence}% confidence</HeaderBadge>
      <HeaderBadge tone={dayStatusTone(dayStatus)}>{dayStatusLabel}</HeaderBadge>
    </div>
  );
}

export function TopHeader() {
  const location = useLocation();
  const { state } = useGuest();
  const isToday = location.pathname === "/today";
  const profileConfidence = Math.round((state.profile?.stats.profileConfidence ?? 0) * 100);
  const routeLabel = ROUTE_LABELS[location.pathname] ?? "CarbonTrail AI";
  const mobileTitle = MOBILE_TITLES[location.pathname] ?? "CarbonTrail AI";

  if (isToday) {
    return (
      <>
        <header
          className="sticky top-0 z-40 border-b px-4 py-1.5 lg:hidden"
          style={{ background: "rgba(245,240,232,0.93)", borderColor: P.border }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <CarbonTrailLogo size="sm" />
              <span className="truncate text-sm font-bold" style={{ fontFamily: DISPLAY_FONT }}>
                Today
              </span>
            </div>
            <TodayTrailBadges compact />
          </div>
        </header>

        <header
          className="sticky top-0 z-30 hidden min-h-[52px] border-b px-5 py-2 lg:flex lg:items-center lg:justify-between lg:gap-4"
          style={{ background: "rgba(245,240,232,0.93)", borderColor: P.border }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-extrabold leading-tight tracking-tight" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
                Today&apos;s Carbon Trail
              </h1>
            </div>
          </div>

          <TodayTrailBadges />
        </header>
      </>
    );
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b px-4 py-1.5 lg:hidden"
        style={{ background: "rgba(245,240,232,0.93)", borderColor: P.border }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CarbonTrailLogo size="sm" />
            <span className="truncate text-sm font-bold">{mobileTitle}</span>
          </div>
          <HeaderBadge tone="sky">{profileConfidence}%</HeaderBadge>
        </div>
      </header>

      <header
        className="sticky top-0 z-30 hidden min-h-[44px] items-center justify-between border-b px-5 py-2 lg:flex"
        style={{ background: "rgba(245,240,232,0.93)", borderColor: P.border }}
      >
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
            {routeLabel}
          </p>
        </div>
        <HeaderBadge tone="sky">{profileConfidence}% profile confidence</HeaderBadge>
      </header>
    </>
  );
}
