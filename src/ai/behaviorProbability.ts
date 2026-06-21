import type { ActivityEntry, UserProfile } from "@/types";
import type { CheckpointSlotId } from "./pandaSchemas";

export type BehaviorPattern = {
  slotId: CheckpointSlotId;
  dayOfWeek: string;
  category: ActivityEntry["category"];
  fieldKey: string;
  fieldValue: string;
  confirmedCount: number;
  observedCount: number;
  probability: number;
  lastConfirmedAt?: string;
};

export function getBehaviorProbability(
  patterns: BehaviorPattern[],
  slotId: CheckpointSlotId,
  dayOfWeek: string,
  category: ActivityEntry["category"],
  fieldKey: string,
  fieldValue: string,
): number {
  const match = patterns.find(
    (pattern) =>
      pattern.slotId === slotId &&
      pattern.dayOfWeek === dayOfWeek &&
      pattern.category === category &&
      pattern.fieldKey === fieldKey &&
      pattern.fieldValue === fieldValue,
  );
  return match?.probability ?? 0;
}

export function inferStatusFromProbability(probability: number): ActivityEntry["status"] {
  if (probability >= 0.8) return "assumed";
  if (probability >= 0.6) return "parsed_pending";
  return "estimated_from_profile";
}

export function recordBehaviorConfirmation(
  patterns: BehaviorPattern[],
  slotId: CheckpointSlotId,
  dayOfWeek: string,
  category: ActivityEntry["category"],
  fieldKey: string,
  fieldValue: string,
): BehaviorPattern[] {
  const existing = patterns.find(
    (pattern) =>
      pattern.slotId === slotId &&
      pattern.dayOfWeek === dayOfWeek &&
      pattern.category === category &&
      pattern.fieldKey === fieldKey &&
      pattern.fieldValue === fieldValue,
  );

  if (existing) {
    const confirmedCount = existing.confirmedCount + 1;
    const observedCount = existing.observedCount + 1;
    return patterns.map((pattern) =>
      pattern === existing
        ? {
            ...pattern,
            confirmedCount,
            observedCount,
            probability: confirmedCount / observedCount,
            lastConfirmedAt: new Date().toISOString(),
          }
        : pattern,
    );
  }

  return [
    ...patterns,
    {
      slotId,
      dayOfWeek,
      category,
      fieldKey,
      fieldValue,
      confirmedCount: 1,
      observedCount: 1,
      probability: 1,
      lastConfirmedAt: new Date().toISOString(),
    },
  ];
}

export function getDefaultCommutePrediction(profile: UserProfile, dayOfWeek: string): {
  status: ActivityEntry["status"];
  probability: number;
  details: Record<string, unknown>;
} | null {
  const mode = profile.core.usualCommuteMode;
  if (!mode || mode === "unknown" || mode === "none") return null;

  const weekday = dayOfWeek.toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(weekday);
  const probability = isWeekday ? 0.82 : 0.45;

  return {
    status: inferStatusFromProbability(probability),
    probability,
    details: {
      mode,
      distanceKm: profile.core.usualCommuteDistanceKm,
      predictedFromMemory: true,
    },
  };
}
