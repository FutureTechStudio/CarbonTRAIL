import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { getActivityCheckpointSlot } from "@/ai/checkpointEngine";
import type { ActivityEntry } from "@/types";
import { activityToTime } from "@/features/today/trailTimeline";

export type TimeCheckpointId = "01" | "03" | "05" | "07" | "09" | "11" | "13" | "15" | "17" | "19" | "21" | "23";

export type ExpectedEventType =
  | "meal"
  | "travel"
  | "work"
  | "delivery"
  | "energy"
  | "waste"
  | "exercise"
  | "social"
  | "digital"
  | "other";

export type TimeCheckpointDefinition = {
  id: TimeCheckpointId;
  label: string;
  startHour: number;
  endHour: number;
  centerHour: number;
  angle: number;
  expectedEventTypes: ExpectedEventType[];
};

export const TIME_CHECKPOINTS: TimeCheckpointDefinition[] = [
  { id: "01", label: "1 AM", startHour: 0, endHour: 2, centerHour: 1, angle: 285, expectedEventTypes: ["energy"] },
  { id: "03", label: "3 AM", startHour: 2, endHour: 4, centerHour: 3, angle: 315, expectedEventTypes: [] },
  { id: "05", label: "5 AM", startHour: 4, endHour: 6, centerHour: 5, angle: 345, expectedEventTypes: [] },
  { id: "07", label: "7 AM", startHour: 6, endHour: 8, centerHour: 7, angle: 15, expectedEventTypes: ["meal", "travel"] },
  { id: "09", label: "9 AM", startHour: 8, endHour: 10, centerHour: 9, angle: 45, expectedEventTypes: ["travel", "work"] },
  { id: "11", label: "11 AM", startHour: 10, endHour: 12, centerHour: 11, angle: 75, expectedEventTypes: ["work"] },
  { id: "13", label: "1 PM", startHour: 12, endHour: 14, centerHour: 13, angle: 105, expectedEventTypes: ["meal"] },
  { id: "15", label: "3 PM", startHour: 14, endHour: 16, centerHour: 15, angle: 135, expectedEventTypes: ["work", "exercise"] },
  { id: "17", label: "5 PM", startHour: 16, endHour: 18, centerHour: 17, angle: 165, expectedEventTypes: ["delivery", "travel"] },
  { id: "19", label: "7 PM", startHour: 18, endHour: 20, centerHour: 19, angle: 195, expectedEventTypes: ["travel", "meal"] },
  { id: "21", label: "9 PM", startHour: 20, endHour: 22, centerHour: 21, angle: 225, expectedEventTypes: ["meal", "energy"] },
  { id: "23", label: "11 PM", startHour: 22, endHour: 24, centerHour: 23, angle: 255, expectedEventTypes: ["energy", "waste"] },
];

export const TIME_CHECKPOINT_BY_ID = new Map(TIME_CHECKPOINTS.map((checkpoint) => [checkpoint.id, checkpoint]));

const SLOT_FALLBACK: Record<CheckpointSlotId, TimeCheckpointId> = {
  morning_start: "07",
  breakfast: "07",
  morning_commute: "09",
  work_study: "09",
  lunch: "13",
  afternoon_activity: "15",
  shopping_delivery: "17",
  evening_commute: "19",
  dinner: "19",
  night_energy: "21",
  waste_final: "23",
  day_summary: "23",
};

export function formatTimeWindow(checkpoint: TimeCheckpointDefinition): string {
  return `Covers ${formatHour(checkpoint.startHour)}-${formatHour(checkpoint.endHour)}`;
}

export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
}

export function timeCheckpointIdForHour(hour: number): TimeCheckpointId {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  const checkpoint = TIME_CHECKPOINTS.find((item) => normalized >= item.startHour && normalized < item.endHour);
  return checkpoint?.id ?? "23";
}

export function parseActivityHour(activity: ActivityEntry): number | null {
  if (typeof activity.eventTime === "string") {
    const match = activity.eventTime.match(/^(\d{1,2})(?::\d{2})?$/);
    if (match) return Number(match[1]);
  }

  const loggedTime = activity.details.loggedTime;
  if (typeof loggedTime === "string") {
    const match = loggedTime.match(/^(\d{1,2})(?::\d{2})?/);
    if (match) return Number(match[1]);
  }

  const time = activityToTime(activity);
  return time.hour;
}

export function getActivityTimeCheckpointId(activity: ActivityEntry): TimeCheckpointId {
  if (activity.checkpointId && TIME_CHECKPOINT_BY_ID.has(activity.checkpointId as TimeCheckpointId)) {
    return activity.checkpointId as TimeCheckpointId;
  }

  const detailCheckpoint = activity.details.checkpointId;
  if (typeof detailCheckpoint === "string" && TIME_CHECKPOINT_BY_ID.has(detailCheckpoint as TimeCheckpointId)) {
    return detailCheckpoint as TimeCheckpointId;
  }

  const hour = parseActivityHour(activity);
  if (hour !== null) return timeCheckpointIdForHour(hour);

  const slot = getActivityCheckpointSlot(activity);
  return slot ? SLOT_FALLBACK[slot] : "13";
}

export function checkpointPromptContext(checkpoint: TimeCheckpointDefinition): string {
  const hints = checkpoint.expectedEventTypes.length ? checkpoint.expectedEventTypes.join(", ") : "anything";
  return `Around ${checkpoint.label} (${formatHour(checkpoint.startHour)}-${formatHour(checkpoint.endHour)}), likely: ${hints}.`;
}
