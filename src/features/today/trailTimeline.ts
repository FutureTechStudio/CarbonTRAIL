import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { getActivityCheckpointSlot } from "@/ai/checkpointEngine";
import type { ActivityEntry } from "@/types";

/** Timeline layout constants (24h strip). */
export const TIMELINE = {
  paddingX: 52,
  width: 856,
  totalWidth: 960,
  dayStartHour: 6,
  dayEndHour: 18,
} as const;

export const SLOT_DEFAULT_TIMES: Record<CheckpointSlotId, { hour: number; minute: number }> = {
  morning_start: { hour: 7, minute: 0 },
  breakfast: { hour: 8, minute: 0 },
  morning_commute: { hour: 8, minute: 30 },
  work_study: { hour: 10, minute: 0 },
  lunch: { hour: 13, minute: 0 },
  afternoon_activity: { hour: 15, minute: 30 },
  shopping_delivery: { hour: 17, minute: 0 },
  evening_commute: { hour: 18, minute: 30 },
  dinner: { hour: 20, minute: 0 },
  night_energy: { hour: 22, minute: 0 },
  waste_final: { hour: 21, minute: 30 },
  day_summary: { hour: 23, minute: 0 },
};

const HOUR_LABELS = [
  { hour: 0, label: "12a" },
  { hour: 6, label: "6a" },
  { hour: 12, label: "12p" },
  { hour: 18, label: "6p" },
  { hour: 24, label: "12a" },
] as const;

export function isNightHour(hour: number): boolean {
  return hour >= TIMELINE.dayEndHour || hour < TIMELINE.dayStartHour;
}

export function minutesFromMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function timeToTimelineX(hour: number, minute = 0): number {
  const ratio = minutesFromMidnight(hour, minute) / (24 * 60);
  return TIMELINE.paddingX + ratio * TIMELINE.width;
}

export function timeToTimelinePercent(hour: number, minute = 0): number {
  return timeToTimelineX(hour, minute) / TIMELINE.totalWidth;
}

export function slotToTime(slot: CheckpointSlotId): { hour: number; minute: number } {
  return SLOT_DEFAULT_TIMES[slot] ?? { hour: 12, minute: 0 };
}

function inferTimeFromActivity(activity: ActivityEntry): { hour: number; minute: number } {
  const label = activity.label.toLowerCase();

  if (label.includes("breakfast") || label.includes("morning meal")) {
    return SLOT_DEFAULT_TIMES.breakfast;
  }
  if (label.includes("lunch")) return SLOT_DEFAULT_TIMES.lunch;
  if (label.includes("dinner") || label.includes("supper")) return SLOT_DEFAULT_TIMES.dinner;
  if (label.includes("evening") && activity.category === "transport") {
    return SLOT_DEFAULT_TIMES.evening_commute;
  }
  if (activity.category === "transport") return SLOT_DEFAULT_TIMES.morning_commute;
  if (activity.category === "food") return SLOT_DEFAULT_TIMES.lunch;
  if (activity.category === "energy") {
    return label.includes("night") || activity.details.acHours
      ? SLOT_DEFAULT_TIMES.night_energy
      : SLOT_DEFAULT_TIMES.work_study;
  }
  if (activity.category === "delivery" || activity.category === "shopping") {
    return SLOT_DEFAULT_TIMES.shopping_delivery;
  }
  if (activity.category === "waste") return SLOT_DEFAULT_TIMES.waste_final;

  return { hour: 12, minute: 0 };
}

export function activityToTime(activity: ActivityEntry): { hour: number; minute: number } {
  const logged = activity.details.loggedTime;
  if (typeof logged === "string") {
    const match = logged.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return { hour: Number(match[1]), minute: Number(match[2]) };
    }
  }

  const slot = activity.details.timeSlot;
  if (typeof slot === "string" && slot in SLOT_DEFAULT_TIMES) {
    return SLOT_DEFAULT_TIMES[slot as CheckpointSlotId];
  }

  const inferredSlot = getActivityCheckpointSlot(activity);
  if (inferredSlot) return SLOT_DEFAULT_TIMES[inferredSlot];

  return inferTimeFromActivity(activity);
}

export function getTimelineHourLabels(): Array<{ hour: number; label: string; x: number }> {
  return HOUR_LABELS.map(({ hour, label }) => ({
    hour,
    label,
    x: timeToTimelineX(hour === 24 ? 0 : hour, 0),
  }));
}

export function getDayNightBands(): Array<{ id: string; x: number; width: number; kind: "night" | "day" }> {
  const { paddingX, width, dayStartHour, dayEndHour } = TIMELINE;
  const hourWidth = width / 24;

  return [
    {
      id: "night-morning",
      x: paddingX,
      width: hourWidth * dayStartHour,
      kind: "night",
    },
    {
      id: "day",
      x: paddingX + hourWidth * dayStartHour,
      width: hourWidth * (dayEndHour - dayStartHour),
      kind: "day",
    },
    {
      id: "night-evening",
      x: paddingX + hourWidth * dayEndHour,
      width: hourWidth * (24 - dayEndHour),
      kind: "night",
    },
  ];
}

/** Slight vertical offset on the trail path based on time + index (avoid overlap). */
export function trailNodeY(hour: number, minute: number, index: number): number {
  const base = isNightHour(hour) ? 198 : 168;
  const wave = Math.sin(minutesFromMidnight(hour, minute) / 90) * 8;
  const stack = (index % 3) * 10;
  return base + wave + stack;
}

export function formatTimelineTime(hour: number, minute: number): string {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return minute > 0 ? `${h}:${String(minute).padStart(2, "0")} ${meridiem}` : `${h} ${meridiem}`;
}
