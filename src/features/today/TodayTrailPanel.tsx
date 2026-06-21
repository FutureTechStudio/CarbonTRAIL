import { CarbonTrailGraph } from "@/components/visuals/CarbonTrailGraph";
import { TodayTrailScene } from "@/components/visuals/TodayTrailScene";
import { UserTrailAvatar } from "@/features/today/UserTrailAvatar";
import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import type { ActivityEntry } from "@/types";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type TodayTrailPanelProps = {
  activities: ActivityEntry[];
  activeSlot?: CheckpointSlotId;
  checkpointStatuses?: Partial<Record<CheckpointSlotId, string>>;
  faded?: boolean;
  showEstimatedOverlay?: boolean;
  onNodeClick?: (activityId: string) => void;
};

function LegendItem({
  label,
  style,
}: {
  label: string;
  style: "solid" | "amber" | "predicted" | "dotted" | "missing";
}) {
  const borderColor =
    style === "amber"
      ? P.amber
      : style === "predicted"
        ? "#7BB8D4"
        : style === "dotted"
          ? "#C4BDB0"
          : style === "missing"
            ? P.faintText
            : P.green;

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium" style={{ color: P.faintText }}>
      <span
        className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 bg-white text-[7px] font-bold leading-none"
        style={{
          borderColor,
          borderStyle: style === "dotted" || style === "missing" ? "dashed" : "solid",
          color: style === "missing" ? P.faintText : "transparent",
        }}
        aria-hidden="true"
      >
        {style === "missing" ? "?" : ""}
      </span>
      {label}
    </span>
  );
}

export function TodayTrailPanel({
  activities,
  activeSlot = "morning_commute",
  checkpointStatuses,
  faded = false,
  showEstimatedOverlay = false,
  onNodeClick,
}: TodayTrailPanelProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border shadow-lg"
      style={{
        borderColor: "rgba(255,255,255,0.75)",
        boxShadow: "0 20px 56px rgba(42, 54, 40, 0.1)",
        background: "linear-gradient(180deg, rgba(253,250,244,0.35) 0%, rgba(253,250,244,0) 28%)",
      }}
    >
      <div className="relative flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
            Living Trail Preview
          </p>
          <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
            Your day as a carbon journey
          </p>
        </div>
        <div className="hidden flex-wrap justify-end gap-2 sm:flex" aria-label="Trail legend">
          <LegendItem label="Confirmed" style="solid" />
          <LegendItem label="Assumed" style="amber" />
          <LegendItem label="Predicted" style="predicted" />
          <LegendItem label="Estimated" style="dotted" />
          <LegendItem label="Missing" style="missing" />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[420px] px-2 pb-2 pt-1">
        <div className="relative">
          <TodayTrailScene
            activities={activities}
            checkpointStatuses={checkpointStatuses}
            faded={faded}
            onNodeClick={onNodeClick}
          />
          <UserTrailAvatar activeSlot={activeSlot} />
        </div>
      </div>

      <div className="overflow-x-hidden px-2 pb-2">
        <CarbonTrailGraph activities={activities} onPointClick={onNodeClick} />
      </div>

      <div className="flex flex-wrap gap-3 px-4 pb-4 sm:hidden" aria-label="Trail legend">
        <LegendItem label="Confirmed" style="solid" />
        <LegendItem label="Assumed" style="amber" />
        <LegendItem label="Predicted" style="predicted" />
        <LegendItem label="Estimated" style="dotted" />
        <LegendItem label="Missing" style="missing" />
      </div>

      {showEstimatedOverlay ? (
        <div className="pointer-events-none absolute inset-x-4 top-[4.5rem]">
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"
            style={{ background: "rgba(253,250,244,0.88)", borderColor: P.border, color: P.charcoal }}
          >
            Estimated from Carbon Memory — confirm to sharpen your trail
          </span>
        </div>
      ) : null}
    </div>
  );
}
