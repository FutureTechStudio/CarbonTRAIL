import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { getActivityCheckpointSlot } from "@/ai/checkpointEngine";
import type { ActivityEntry } from "@/types";

const JOURNEY_SLOTS: CheckpointSlotId[] = [
  "breakfast",
  "morning_commute",
  "work_study",
  "lunch",
  "afternoon_activity",
  "shopping_delivery",
  "evening_commute",
  "dinner",
  "night_energy",
  "waste_final",
];

const BOARD_STOPS: CheckpointSlotId[] = ["morning_start", ...JOURNEY_SLOTS, "day_summary"];

const BOARD = {
  width: 380,
  height: 920,
} as const;

/** Journey path: morning (bottom) → day (left) → evening (top) → night (right). */
const SCENIC_STOPS: Record<CheckpointSlotId, { x: number; y: number }> = {
  morning_start: { x: 190, y: 868 },
  breakfast: { x: 152, y: 812 },
  morning_commute: { x: 122, y: 752 },
  work_study: { x: 86, y: 648 },
  lunch: { x: 74, y: 538 },
  afternoon_activity: { x: 80, y: 438 },
  shopping_delivery: { x: 96, y: 338 },
  evening_commute: { x: 148, y: 228 },
  dinner: { x: 190, y: 132 },
  night_energy: { x: 272, y: 228 },
  waste_final: { x: 296, y: 432 },
  day_summary: { x: 284, y: 612 },
};

function buildJourneyPath(stops: Array<{ x: number; y: number }>): string {
  if (stops.length === 0) return "";
  let path = `M ${stops[0].x} ${stops[0].y}`;
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const current = stops[index];
    const control1X = previous.x + (current.x - previous.x) * 0.42;
    const control1Y = previous.y + (current.y - previous.y) * 0.12;
    const control2X = previous.x + (current.x - previous.x) * 0.58;
    const control2Y = previous.y + (current.y - previous.y) * 0.88;
    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${current.x} ${current.y}`;
  }
  return path;
}

const STOP_POINTS = BOARD_STOPS.map((slot) => SCENIC_STOPS[slot]);

/** Cross-shaped daily journey board — evening top, morning bottom, day left, night right. */
export const SCENE = {
  width: BOARD.width,
  height: BOARD.height,
  pathD: buildJourneyPath(STOP_POINTS),
} as const;

export type NodeVisualStyle = {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fill: string;
  opacity: number;
  glow?: string;
};

export type DayZoneId = "evening" | "morning" | "day" | "night";

export type DayZone = {
  id: DayZoneId;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  labelX: number;
  labelY: number;
  lightText?: boolean;
};

export const DAY_ZONES: DayZone[] = [
  {
    id: "evening",
    x: 0,
    y: 0,
    width: BOARD.width,
    height: 200,
    label: "Evening",
    labelX: 14,
    labelY: 18,
  },
  {
    id: "morning",
    x: 0,
    y: 720,
    width: BOARD.width,
    height: 200,
    label: "Morning",
    labelX: 14,
    labelY: 742,
  },
  {
    id: "day",
    x: 0,
    y: 168,
    width: 178,
    height: 584,
    label: "Day",
    labelX: 14,
    labelY: 192,
  },
  {
    id: "night",
    x: 202,
    y: 168,
    width: 178,
    height: 584,
    label: "Night",
    labelX: 302,
    labelY: 192,
    lightText: true,
  },
];

export function slotToScenePoint(slot: CheckpointSlotId): { x: number; y: number } {
  return SCENIC_STOPS[slot] ?? SCENIC_STOPS.morning_commute;
}

export function slotToScenePercent(slot: CheckpointSlotId): { left: string; top: string } {
  const { x, y } = slotToScenePoint(slot);
  return {
    left: `${((x / SCENE.width) * 100).toFixed(2)}%`,
    top: `${((y / SCENE.height) * 100).toFixed(2)}%`,
  };
}

export function activityToCheckpoint(activity: ActivityEntry): CheckpointSlotId | null {
  const slot = activity.details.timeSlot;
  if (typeof slot === "string" && slot in SCENIC_STOPS) {
    return slot as CheckpointSlotId;
  }
  return getActivityCheckpointSlot(activity);
}

export function activityToScenePoint(activity: ActivityEntry, stackIndex = 0): { x: number; y: number } {
  const slot = activityToCheckpoint(activity);
  const base = slot ? slotToScenePoint(slot) : SCENIC_STOPS.lunch;
  const offsetY = stackIndex * 7;
  const offsetX = (stackIndex % 2 === 0 ? -1 : 1) * (5 + stackIndex * 3);
  return { x: base.x + offsetX, y: base.y + offsetY };
}

export function getNodeVisualStyle(activity: ActivityEntry): NodeVisualStyle {
  if (activity.status === "estimated_from_profile" || activity.visualEffect.style === "faded_dotted") {
    return {
      stroke: "#C4BDB0",
      strokeWidth: 2,
      strokeDasharray: "4 3",
      fill: "rgba(255,255,255,0.72)",
      opacity: 0.62,
    };
  }
  if (activity.status === "parsed_pending") {
    return {
      stroke: "#7BB8D4",
      strokeWidth: 2.2,
      strokeDasharray: "3 3",
      fill: "#FFFFFF",
      opacity: 0.92,
    };
  }
  if (activity.status === "assumed" || activity.visualEffect.style === "amber_outline") {
    return {
      stroke: "#E8923A",
      strokeWidth: 2.2,
      strokeDasharray: "5 3",
      fill: "#FFFFFF",
      opacity: 0.95,
    };
  }
  return {
    stroke: "#2D7A4F",
    strokeWidth: 2.5,
    fill: "#FFFFFF",
    opacity: 1,
    glow: "rgba(76, 175, 125, 0.35)",
  };
}

export function getMissingJourneySlots(
  statuses: Partial<Record<CheckpointSlotId, string>> | undefined,
): CheckpointSlotId[] {
  if (!statuses) return [];
  return JOURNEY_SLOTS.filter((slot) => statuses[slot] === "missing");
}

export function shouldShowHouseHaze(activities: ActivityEntry[]): boolean {
  return activities.some(
    (activity) =>
      activity.category === "energy" &&
      (activity.visualEffect.smoke === "high" ||
        activity.visualEffect.smoke === "medium" ||
        Number(activity.details.acHours ?? 0) >= 3),
  );
}

export function getCarbonEffectType(
  activity: ActivityEntry,
): "heavy_smoke" | "light_smoke" | "green_trail" | "parcel" | "green_food" | "soil" | "none" {
  if (activity.category === "waste") return "soil";
  if (activity.category === "delivery" || activity.category === "shopping") return "parcel";
  if (activity.category === "transport") {
    const mode = String(activity.details.mode ?? "");
    if (mode === "walk" || mode === "cycle") return "green_trail";
    if (mode === "bus" || mode === "carpool" || mode === "metro") return "light_smoke";
    if (mode === "car" || mode === "scooter" || mode === "auto") return "heavy_smoke";
  }
  if (activity.category === "food") {
    const source = String(activity.details.mealSource ?? "");
    if (source.includes("home") || activity.label.toLowerCase().includes("home")) return "green_food";
    if (source.includes("order") || activity.label.toLowerCase().includes("order")) return "parcel";
  }
  if (activity.estimates.savedCo2eKg > 0) return "green_trail";
  return "none";
}

export { JOURNEY_SLOTS, SCENIC_STOPS };
