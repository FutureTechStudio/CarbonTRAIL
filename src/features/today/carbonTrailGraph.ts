import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { CHECKPOINT_SLOTS } from "@/ai/pandaSchemas";
import type { ActivityEntry, DataStatus } from "@/types";
import { formatActivityTypeLine, getActivityEmoji } from "./todayHelpers";
import { activityToCheckpoint, activityToScenePoint, SCENE } from "./trailSceneLayout";
import { activityToTime, formatTimelineTime } from "./trailTimeline";

export type CarbonTrailGraphPoint = {
  activityId: string;
  label: string;
  x: number;
  /** Footprint for this event only — not a running total. */
  valueKg: number;
  estimated: boolean;
  hour: number;
  minute: number;
  timeLabel: string;
  detailLine: string;
  emoji: string;
  status: DataStatus;
};

export type CarbonTrailHourGroup = {
  hour: number;
  hourLabel: string;
  totalKg: number;
  events: CarbonTrailGraphPoint[];
};

export const CARBON_GRAPH = {
  width: SCENE.width,
  height: 112,
  paddingX: 52,
  paddingTop: 14,
  plotHeight: 68,
  barWidth: 26,
} as const;

const SLOT_ORDER = new Map<CheckpointSlotId, number>(
  CHECKPOINT_SLOTS.map((slot) => [slot.id, slot.order]),
);

function journeySortKey(activity: ActivityEntry): number {
  const slot = activityToCheckpoint(activity);
  const slotOrder = slot ? (SLOT_ORDER.get(slot) ?? 99) : 99;
  const time = activityToTime(activity);
  const sceneX = activityToScenePoint(activity).x;
  return slotOrder * 1000 + time.hour * 60 + time.minute + sceneX * 0.01;
}

/** Footprint for a single event (not cumulative). */
export function eventCarbonValue(activity: ActivityEntry): number {
  return activity.estimates.co2eKg;
}

/** @deprecated Use eventCarbonValue */
export function eventCarbonDelta(activity: ActivityEntry): number {
  return activity.estimates.co2eKg - activity.estimates.savedCo2eKg;
}

/** Build per-event carbon trail points ordered along the day journey. */
export function buildCarbonTrailSeries(activities: ActivityEntry[]): CarbonTrailGraphPoint[] {
  const sorted = [...activities].sort((a, b) => journeySortKey(a) - journeySortKey(b));

  return sorted.map((activity) => {
    const { x } = activityToScenePoint(activity);
    const time = activityToTime(activity);
    return {
      activityId: activity.id,
      label: activity.label,
      x,
      valueKg: Math.round(eventCarbonValue(activity) * 1000) / 1000,
      estimated: activity.status === "estimated_from_profile",
      hour: time.hour,
      minute: time.minute,
      timeLabel: formatTimelineTime(time.hour, time.minute),
      detailLine: formatActivityTypeLine(activity),
      emoji: getActivityEmoji(activity),
      status: activity.status,
    };
  });
}

/** Group trail events by clock hour for detail panels. */
export function groupCarbonTrailByHour(points: CarbonTrailGraphPoint[]): CarbonTrailHourGroup[] {
  const byHour = new Map<number, CarbonTrailGraphPoint[]>();

  for (const point of points) {
    const bucket = byHour.get(point.hour) ?? [];
    bucket.push(point);
    byHour.set(point.hour, bucket);
  }

  return [...byHour.entries()]
    .sort(([hourA], [hourB]) => hourA - hourB)
    .map(([hour, events]) => {
      const sortedEvents = [...events].sort((a, b) => a.minute - b.minute || a.x - b.x);
      return {
        hour,
        hourLabel: formatTimelineTime(hour, 0),
        totalKg: Math.round(sortedEvents.reduce((sum, event) => sum + event.valueKg, 0) * 1000) / 1000,
        events: sortedEvents,
      };
    });
}

export function getCarbonGraphYRange(points: CarbonTrailGraphPoint[]): { min: number; max: number } {
  const values = [0, ...points.map((point) => point.valueKg)];
  const min = 0;
  const max = Math.max(...values, 0.5);
  return { min, max: max === min ? min + 0.5 : max };
}

export function carbonKgToGraphY(kg: number, min: number, max: number): number {
  const range = Math.max(max - min, 0.25);
  const ratio = (kg - min) / range;
  return CARBON_GRAPH.paddingTop + CARBON_GRAPH.plotHeight - ratio * CARBON_GRAPH.plotHeight;
}

export function getCarbonBarGeometry(
  point: CarbonTrailGraphPoint,
  min: number,
  max: number,
): { x: number; y: number; width: number; height: number; baselineY: number } {
  const baselineY = carbonKgToGraphY(0, min, max);
  const topY = carbonKgToGraphY(point.valueKg, min, max);
  const height = Math.max(baselineY - topY, point.valueKg > 0 ? 4 : 0);

  return {
    x: point.x - CARBON_GRAPH.barWidth / 2,
    y: baselineY - height,
    width: CARBON_GRAPH.barWidth,
    height,
    baselineY,
  };
}

export function barFillColor(valueKg: number, max: number, estimated: boolean): string {
  if (estimated) return "#C4BDB0";
  if (valueKg >= max * 0.65) return "#E8923A";
  return "#4CAF7D";
}

export function formatCarbonKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

export type DayCarbonLevel = "low" | "medium" | "high";

const DAY_CARBON_THRESHOLDS = {
  lowMaxKg: 4,
  mediumMaxKg: 7,
} as const;

export function sumDayCarbonKg(points: CarbonTrailGraphPoint[]): number {
  return Math.round(points.reduce((sum, point) => sum + point.valueKg, 0) * 10) / 10;
}

export function getDayCarbonLevel(totalKg: number): DayCarbonLevel {
  if (totalKg <= DAY_CARBON_THRESHOLDS.lowMaxKg) return "low";
  if (totalKg <= DAY_CARBON_THRESHOLDS.mediumMaxKg) return "medium";
  return "high";
}

export function dayCarbonLevelStyle(level: DayCarbonLevel): {
  background: string;
  color: string;
  borderColor: string;
  label: string;
} {
  if (level === "low") {
    return { background: "#e6f6ed", color: "#2D7A4F", borderColor: "#c8e0c4", label: "Low" };
  }
  if (level === "medium") {
    return { background: "#fff3e3", color: "#B86A10", borderColor: "#f0d4a8", label: "Medium" };
  }
  return { background: "#fdecea", color: "#B83428", borderColor: "#f0c4c0", label: "High" };
}
