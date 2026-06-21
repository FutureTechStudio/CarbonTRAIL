import type { ActivityDay, ActivityEntry, UserProfile } from "@/types";
import type { CheckpointSlotId } from "./pandaSchemas";
import { CHECKPOINT_SLOTS } from "./pandaSchemas";

const SLOT_CATEGORY_MAP: Partial<Record<CheckpointSlotId, ActivityEntry["category"][]>> = {
  morning_commute: ["transport"],
  evening_commute: ["transport"],
  breakfast: ["food"],
  lunch: ["food"],
  dinner: ["food"],
  work_study: ["energy"],
  afternoon_activity: ["energy"],
  night_energy: ["energy"],
  shopping_delivery: ["delivery", "shopping"],
  waste_final: ["waste"],
};

export function getCheckpointStatuses(day?: ActivityDay): Partial<
  Record<CheckpointSlotId, "confirmed" | "assumed" | "predicted" | "estimated" | "missing">
> {
  const statuses: Partial<
    Record<CheckpointSlotId, "confirmed" | "assumed" | "predicted" | "estimated" | "missing">
  > = {};

  for (const slot of CHECKPOINT_SLOTS) {
    statuses[slot.id] = "missing";
  }

  if (!day) return statuses;

  for (const activity of day.activities) {
    const slot = inferActivitySlot(activity);
    if (!slot) continue;
    statuses[slot] = mapActivityStatus(activity.status);
  }

  return statuses;
}

export function getActivityCheckpointSlot(activity: ActivityEntry): CheckpointSlotId | null {
  return inferActivitySlot(activity);
}

function inferActivitySlot(activity: ActivityEntry): CheckpointSlotId | null {
  if (activity.category === "transport") {
    return activity.activityType.includes("return") || activity.label.toLowerCase().includes("evening")
      ? "evening_commute"
      : "morning_commute";
  }
  if (activity.category === "food") {
    const label = activity.label.toLowerCase();
    if (label.includes("breakfast")) return "breakfast";
    if (label.includes("dinner")) return "dinner";
    return "lunch";
  }
  if (activity.category === "energy") {
    if (activity.details.acHours || activity.activityType.includes("home")) return "night_energy";
    if (activity.activityType.includes("afternoon")) return "afternoon_activity";
    return "work_study";
  }
  if (activity.category === "delivery" || activity.category === "shopping") return "shopping_delivery";
  if (activity.category === "waste") return "waste_final";
  return null;
}

function mapActivityStatus(
  status: ActivityEntry["status"],
): "confirmed" | "assumed" | "predicted" | "estimated" | "missing" {
  if (status === "confirmed") return "confirmed";
  if (status === "assumed") return "assumed";
  if (status === "estimated_from_profile") return "estimated";
  if (status === "parsed_pending") return "predicted";
  return "missing";
}

export function getActiveCheckpointSlot(
  statuses: Partial<Record<CheckpointSlotId, string>>,
  now = new Date(),
): CheckpointSlotId {
  const hour = now.getHours();

  const hourSlot: CheckpointSlotId =
    hour < 9
      ? "morning_commute"
      : hour < 12
        ? "work_study"
        : hour < 14
          ? "lunch"
          : hour < 17
            ? "afternoon_activity"
            : hour < 20
              ? "evening_commute"
              : hour < 22
                ? "dinner"
                : "night_energy";

  if (statuses[hourSlot] === "missing" || statuses[hourSlot] === "estimated") return hourSlot;

  const firstMissing = CHECKPOINT_SLOTS.find(
    (slot) => statuses[slot.id] === "missing" || statuses[slot.id] === "estimated",
  );
  return firstMissing?.id ?? "day_summary";
}

export function slotHasActivity(day: ActivityDay | undefined, slot: CheckpointSlotId): boolean {
  if (!day) return false;
  const categories = SLOT_CATEGORY_MAP[slot];
  if (!categories) return false;
  return day.activities.some((activity) => categories.includes(activity.category));
}

export function getUserAvatarPosition(activeSlot: CheckpointSlotId): { x: number; y: number } {
  const positions: Record<CheckpointSlotId, { x: number; y: number }> = {
    morning_start: { x: 8, y: 72 },
    breakfast: { x: 14, y: 58 },
    morning_commute: { x: 22, y: 48 },
    work_study: { x: 34, y: 42 },
    lunch: { x: 46, y: 50 },
    afternoon_activity: { x: 56, y: 44 },
    shopping_delivery: { x: 64, y: 52 },
    evening_commute: { x: 74, y: 46 },
    dinner: { x: 84, y: 54 },
    night_energy: { x: 92, y: 62 },
    waste_final: { x: 96, y: 72 },
    day_summary: { x: 98, y: 78 },
  };
  return positions[activeSlot] ?? positions.day_summary;
}

export function applyQuickReplyToParse(reply: string, profile: UserProfile): Partial<ActivityEntry> | null {
  const normalized = reply.toLowerCase();

  if (normalized.includes("yes") && normalized.includes("scooter")) {
    return {
      category: "transport",
      activityType: "commute_outbound",
      label: "Morning Commute",
      status: "confirmed",
      source: "chip",
      details: {
        mode: "scooter",
        distanceKm: profile.core.usualCommuteDistanceKm,
      },
    };
  }

  const modeMap: Array<[string, string]> = [
    ["bus", "bus"],
    ["auto", "auto"],
    ["carpool", "carpool"],
    ["scooter", "scooter"],
    ["walk", "walk"],
    ["car", "car"],
  ];

  for (const [token, mode] of modeMap) {
    if (normalized.includes(token)) {
      return {
        category: "transport",
        activityType: "commute_outbound",
        label: "Morning Commute",
        status: "confirmed",
        source: "chip",
        details: {
          mode,
          distanceKm: profile.core.usualCommuteDistanceKm,
        },
      };
    }
  }

  return null;
}
