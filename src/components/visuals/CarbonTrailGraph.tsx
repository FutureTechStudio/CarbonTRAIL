import type { ActivityEntry } from "@/types";
import {
  barFillColor,
  buildCarbonTrailSeries,
  CARBON_GRAPH,
  carbonKgToGraphY,
  dayCarbonLevelStyle,
  formatCarbonKg,
  getCarbonBarGeometry,
  getCarbonGraphYRange,
  getDayCarbonLevel,
  groupCarbonTrailByHour,
  sumDayCarbonKg,
} from "@/features/today/carbonTrailGraph";
import { P } from "@/theme/palette";

function truncateLabel(label: string, max = 10): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

type CarbonTrailGraphProps = {
  activities: ActivityEntry[];
  onPointClick?: (activityId: string) => void;
  showHourGroups?: boolean;
};

export function CarbonTrailGraph({
  activities,
  onPointClick,
  showHourGroups = false,
}: CarbonTrailGraphProps) {
  const points = buildCarbonTrailSeries(activities);
  const hourGroups = groupCarbonTrailByHour(points);
  const { min, max } = getCarbonGraphYRange(points);
  const baselineY = carbonKgToGraphY(0, min, max);
  const dayTotalKg = sumDayCarbonKg(points);
  const dayLevel = getDayCarbonLevel(dayTotalKg);
  const dayStyle = dayCarbonLevelStyle(dayLevel);

  return (
    <div
      className="border-t px-2 pt-2"
      style={{ borderColor: "rgba(228, 237, 232, 0.9)", background: "rgba(253,250,244,0.55)" }}
    >
      <div className="mb-1 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold" style={{ color: P.charcoal }}>
          Carbon trail
        </p>
        <span
          className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: dayStyle.background,
            borderColor: dayStyle.borderColor,
            color: P.charcoal,
          }}
        >
          {formatCarbonKg(dayTotalKg)} today
        </span>
      </div>

      <svg
        viewBox={`0 0 ${CARBON_GRAPH.width} ${CARBON_GRAPH.height}`}
        className="h-[112px] w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Carbon trail bars showing footprint at each of ${points.length} recorded events`}
      >
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = CARBON_GRAPH.paddingTop + CARBON_GRAPH.plotHeight * (1 - ratio);
          return (
            <line
              key={ratio}
              x1={CARBON_GRAPH.paddingX}
              y1={y}
              x2={CARBON_GRAPH.width - CARBON_GRAPH.paddingX}
              y2={y}
              stroke={P.border}
              strokeWidth={1}
              strokeDasharray="4 6"
              opacity={0.65}
            />
          );
        })}

        <line
          x1={CARBON_GRAPH.paddingX}
          y1={baselineY}
          x2={CARBON_GRAPH.width - CARBON_GRAPH.paddingX}
          y2={baselineY}
          stroke={P.border}
          strokeWidth={1.2}
          opacity={0.85}
        />

        {points.map((point) => {
          const bar = getCarbonBarGeometry(point, min, max);
          const fill = barFillColor(point.valueKg, max, point.estimated);
          const high = point.valueKg >= max * 0.65;

          return (
            <g
              key={point.activityId}
              role={onPointClick ? "button" : undefined}
              tabIndex={onPointClick ? 0 : undefined}
              aria-label={`${point.label}: ${point.valueKg.toFixed(1)} kg CO2 at this stop`}
              className={onPointClick ? "cursor-pointer focus:outline-none" : undefined}
              onClick={() => onPointClick?.(point.activityId)}
              onKeyDown={(event) => {
                if (!onPointClick) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPointClick(point.activityId);
                }
              }}
              opacity={point.estimated ? 0.58 : 1}
            >
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill={fill}
                fillOpacity={point.estimated ? 0.45 : high ? 0.88 : 0.78}
                stroke={point.estimated ? "#C4BDB0" : high ? P.amber : P.green}
                strokeWidth={1.5}
                strokeDasharray={point.estimated ? "3 2" : undefined}
              />
              <text x={point.x} y={bar.y - 5} textAnchor="middle" fontSize={8} fill={P.mutedText} fontWeight={600}>
                {point.emoji} {point.valueKg.toFixed(1)}
              </text>
              <text x={point.x} y={baselineY + 11} textAnchor="middle" fontSize={7} fill={P.faintText}>
                {truncateLabel(point.label)}
              </text>
            </g>
          );
        })}

        <text x={CARBON_GRAPH.paddingX} y={CARBON_GRAPH.height - 4} fontSize={9} fill={P.faintText}>
          Morning
        </text>
        <text
          x={CARBON_GRAPH.width - CARBON_GRAPH.paddingX}
          y={CARBON_GRAPH.height - 4}
          textAnchor="end"
          fontSize={9}
          fill={P.faintText}
        >
          Night
        </text>
        <text x={4} y={CARBON_GRAPH.paddingTop + 4} fontSize={8} fill={P.faintText}>
          {formatCarbonKg(max)}
        </text>
        <text x={4} y={CARBON_GRAPH.paddingTop + CARBON_GRAPH.plotHeight} fontSize={8} fill={P.faintText}>
          0 kg
        </text>
      </svg>

      {showHourGroups && hourGroups.length > 0 ? (
        <div className="space-y-2 px-2 pb-2 pt-1">
          {hourGroups.map((group) => (
            <section
              key={group.hour}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: "rgba(228, 237, 232, 0.95)", background: "rgba(255,255,255,0.72)" }}
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold" style={{ color: P.charcoal }}>
                  {group.hourLabel}
                </p>
                <p className="text-[10px] font-medium" style={{ color: P.faintText }}>
                  {group.events.length} event{group.events.length === 1 ? "" : "s"} · {formatCarbonKg(group.totalKg)}
                </p>
              </div>

              <ul className="space-y-1.5">
                {group.events.map((event) => (
                  <li key={event.activityId}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                      style={{ outlineColor: P.green }}
                      onClick={() => onPointClick?.(event.activityId)}
                      aria-label={`${event.label} at ${event.timeLabel}, ${formatCarbonKg(event.valueKg)}`}
                    >
                      <span className="text-sm leading-none" aria-hidden="true">
                        {event.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[11px] font-semibold" style={{ color: P.charcoal }}>
                            {event.label}
                          </span>
                          <span className="text-[10px]" style={{ color: P.faintText }}>
                            {event.timeLabel}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug" style={{ color: P.mutedText }}>
                          {event.detailLine}
                        </span>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: event.estimated ? "rgba(196,189,176,0.25)" : `${P.green}18`,
                          color: event.estimated ? P.faintText : P.charcoal,
                        }}
                      >
                        {formatCarbonKg(event.valueKg)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
