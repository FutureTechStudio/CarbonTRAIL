import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { CHECKPOINT_SLOTS } from "@/ai/pandaSchemas";
import type { ActivityEntry } from "@/types";
import { getActivityEmoji } from "@/features/today/todayHelpers";
import {
  DAY_ZONES,
  SCENE,
  activityToCheckpoint,
  activityToScenePoint,
  getCarbonEffectType,
  getMissingJourneySlots,
  getNodeVisualStyle,
  shouldShowHouseHaze,
  slotToScenePoint,
} from "@/features/today/trailSceneLayout";
import { activityToTime, formatTimelineTime } from "@/features/today/trailTimeline";
import { P } from "@/theme/palette";
import "./today-trail-scene.css";

type TodayTrailSceneProps = {
  activities: ActivityEntry[];
  checkpointStatuses?: Partial<Record<CheckpointSlotId, string>>;
  faded?: boolean;
  onNodeClick?: (activityId: string) => void;
};

function slotLabel(slot: CheckpointSlotId): string {
  const match = CHECKPOINT_SLOTS.find((item) => item.id === slot);
  if (!match) return slot.replace(/_/g, " ");
  return match.label.length > 14 ? `${match.label.slice(0, 12)}…` : match.label;
}

function truncateLabel(label: string, max = 11): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function SmokePuff({ cx, cy, r = 12, opacity = 0.34 }: { cx: number; cy: number; r?: number; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={P.smoke} />
      <circle cx={cx + r * 0.7} cy={cy - r * 0.6} r={r * 0.65} fill={P.smoke} />
    </g>
  );
}

function MiniTree({ x, y, scale = 0.34 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={0.55}>
      <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
      <polygon points="30,4 4,52 56,52" fill={P.green} />
    </g>
  );
}

function NightHouse({ x, y, haze = false }: { x: number; y: number; haze?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {haze ? <ellipse cx={22} cy={28} rx={30} ry={16} fill={P.smoke} opacity={0.3} /> : null}
      <rect x={8} y={18} width={28} height={20} fill="#F0E8D4" rx={2} />
      <polygon points="6,20 38,20 22,4" fill="#C8A864" />
      <rect x={14} y={26} width={7} height={7} fill="#FFE08A" opacity={0.85} rx={1} />
    </g>
  );
}

function CarbonEffect({ type, x, y }: { type: ReturnType<typeof getCarbonEffectType>; x: number; y: number }) {
  if (type === "heavy_smoke") return <SmokePuff cx={x} cy={y - 24} r={11} opacity={0.4} />;
  if (type === "light_smoke") return <SmokePuff cx={x} cy={y - 20} r={8} opacity={0.22} />;
  if (type === "green_trail") {
    return (
      <g opacity={0.5}>
        <ellipse cx={x - 8} cy={y + 10} rx={7} ry={3.5} fill={P.lightGreen} />
        <ellipse cx={x + 7} cy={y + 12} rx={6} ry={3} fill={P.leaf} />
      </g>
    );
  }
  if (type === "parcel") {
    return (
      <g transform={`translate(${x + 14},${y - 6})`} opacity={0.68}>
        <rect x={0} y={3} width={10} height={9} rx={1} fill="#D4A574" />
      </g>
    );
  }
  if (type === "green_food") {
    return <ellipse cx={x + 12} cy={y + 8} rx={9} ry={5} fill={P.lightGreen} opacity={0.4} />;
  }
  if (type === "soil") {
    return (
      <g transform={`translate(${x + 10},${y + 6})`} opacity={0.5}>
        <ellipse cx={6} cy={7} rx={8} ry={3.5} fill={P.soil} />
      </g>
    );
  }
  return null;
}

function MissingNode({ slot, onClick }: { slot: CheckpointSlotId; onClick?: () => void }) {
  const { x, y } = slotToScenePoint(slot);
  return (
    <g
      className="trail-scene__node"
      role="button"
      tabIndex={0}
      aria-label={`${slotLabel(slot)} not logged yet`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      opacity={0.75}
    >
      <circle cx={x} cy={y} r={17} fill="rgba(255,255,255,0.6)" stroke="#C4BDB0" strokeWidth={1.8} strokeDasharray="4 3" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={13} fill={P.faintText} fontWeight={700}>
        ?
      </text>
      <text x={x} y={y + 30} textAnchor="middle" fontSize={8} fill={P.faintText} fontWeight={600}>
        {slotLabel(slot)}
      </text>
    </g>
  );
}

function ZoneBackdrop() {
  return (
    <>
      <defs>
        <linearGradient id="zoneNight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A4455" />
          <stop offset="100%" stopColor="#2A3548" />
        </linearGradient>
        <linearGradient id="zoneMorning" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFD8A8" />
          <stop offset="100%" stopColor="#B8E4F5" />
        </linearGradient>
        <linearGradient id="zoneDay" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#DFF0E0" />
          <stop offset="100%" stopColor="#C8E8F0" />
        </linearGradient>
        <linearGradient id="zoneEvening" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C8A0" />
          <stop offset="100%" stopColor="#C8D8E8" />
        </linearGradient>
        <linearGradient id="boardPath" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#D4B896" />
          <stop offset="45%" stopColor="#C4A882" />
          <stop offset="100%" stopColor="#7A8898" />
        </linearGradient>
        <filter id="boardNodeShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity={0.12} />
        </filter>
      </defs>

      {DAY_ZONES.map((zone) => {
        const fill =
          zone.id === "night"
            ? "url(#zoneNight)"
            : zone.id === "morning"
              ? "url(#zoneMorning)"
              : zone.id === "day"
                ? "url(#zoneDay)"
                : "url(#zoneEvening)";
        return (
          <g key={zone.id}>
            <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill={fill} opacity={0.9} />
            <text
              x={zone.labelX}
              y={zone.labelY}
              textAnchor={zone.id === "night" ? "end" : "start"}
              fontSize={9}
              fill={zone.lightText ? "rgba(255,255,255,0.75)" : "rgba(42,54,40,0.45)"}
              fontWeight={600}
            >
              {zone.label}
            </text>
          </g>
        );
      })}

      <circle cx={300} cy={320} r={15} fill="#E8EEF5" opacity={0.95} />
      {[
        [268, 260],
        [312, 288],
        [330, 360],
        [286, 420],
        [318, 500],
      ].map(([sx, sy], index) => (
        <circle key={index} cx={sx} cy={sy} r={1.4} fill="#FFFFFF" opacity={0.8} />
      ))}

      <circle cx={190} cy={842} r={20} fill="#FFE08A" opacity={0.88} />
      <circle cx={190} cy={842} r={30} fill="#FFE08A" opacity={0.16} />

      <ellipse cx={72} cy={430} rx={34} ry={10} fill="rgba(255,255,255,0.48)" />
      <ellipse cx={118} cy={360} rx={24} ry={8} fill="rgba(255,255,255,0.34)" />

      <MiniTree x={24} y={400} />
      <MiniTree x={48} y={520} scale={0.3} />
      <MiniTree x={36} y={640} scale={0.28} />
    </>
  );
}

export function TodayTrailScene({
  activities,
  checkpointStatuses,
  faded = false,
  onNodeClick,
}: TodayTrailSceneProps) {
  const sceneOpacity = faded ? 0.78 : 1;
  const houseHaze = shouldShowHouseHaze(activities);
  const missingSlots = getMissingJourneySlots(checkpointStatuses);

  const slotCounts = new Map<string, number>();
  const nodes = activities.map((activity) => {
    const slot = activityToCheckpoint(activity) ?? "lunch";
    const stackIndex = slotCounts.get(slot) ?? 0;
    slotCounts.set(slot, stackIndex + 1);
    const point = activityToScenePoint(activity, stackIndex);
    const time = activityToTime(activity);
    return { activity, point, time, effect: getCarbonEffectType(activity) };
  });

  const occupiedSlots = new Set(
    activities.map((activity) => activityToCheckpoint(activity)).filter(Boolean) as CheckpointSlotId[],
  );
  const visibleMissing = missingSlots.filter((slot) => !occupiedSlots.has(slot));

  return (
    <svg
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      className="mx-auto h-auto w-full max-w-[420px]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Daily carbon journey board with evening at top, morning at bottom, day on the left, and night on the right"
      style={{ opacity: sceneOpacity }}
    >
      <ZoneBackdrop />

      <NightHouse x={248} y={468} haze={houseHaze} />

      <path
        d={SCENE.pathD}
        stroke="#D4C4A8"
        strokeWidth={16}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.24}
      />
      <path
        d={SCENE.pathD}
        stroke="url(#boardPath)"
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
        strokeDasharray={faded ? "10 8" : undefined}
      />
      <path
        d={SCENE.pathD}
        stroke="white"
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="4 8"
        opacity={0.32}
      />

      {visibleMissing.map((slot) => (
        <MissingNode key={slot} slot={slot} onClick={() => onNodeClick?.(slot)} />
      ))}

      {nodes.map(({ activity, point, time, effect }) => {
        const style = getNodeVisualStyle(activity);
        const emoji = getActivityEmoji(activity);
        const radius = style.opacity < 0.7 ? 18 : 20;
        const label = truncateLabel(activity.label);
        const timeLabel = formatTimelineTime(time.hour, time.minute);
        const showTime = activity.status !== "estimated_from_profile";

        return (
          <g
            key={activity.id}
            className="trail-scene__node"
            role="button"
            tabIndex={0}
            aria-label={`${activity.label}${showTime ? ` at ${timeLabel}` : ""}, ${activity.estimates.co2eKg.toFixed(1)} kilograms CO2, ${activity.status.replace(/_/g, " ")}`}
            opacity={style.opacity}
            onClick={() => onNodeClick?.(activity.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onNodeClick?.(activity.id);
              }
            }}
          >
            <CarbonEffect type={effect} x={point.x} y={point.y} />
            {style.glow ? <circle cx={point.x} cy={point.y} r={radius + 5} fill={style.glow} /> : null}
            <g filter={style.opacity >= 0.9 ? "url(#boardNodeShadow)" : undefined}>
              <circle
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
              />
            </g>
            <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize={style.opacity < 0.7 ? 11 : 13}>
              {emoji}
            </text>
            <text
              x={point.x}
              y={point.y + radius + 11}
              textAnchor="middle"
              fontSize={8}
              fill={P.mutedText}
              fontWeight={600}
              fontFamily="DM Sans, sans-serif"
            >
              {label}
            </text>
            {showTime ? (
              <text x={point.x} y={point.y + radius + 20} textAnchor="middle" fontSize={7} fill={P.faintText}>
                {timeLabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
