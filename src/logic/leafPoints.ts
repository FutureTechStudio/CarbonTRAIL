import type { LeafPointEvent, LeafPointEventType } from "@/types";

const EVENT_POINTS: Record<LeafPointEventType, number> = {
  detail_shared: 10,
  activity_corrected: 20,
  profile_detail_added: 20,
  learned_pattern_confirmed: 15,
  day_confirmed: 15,
  daily_reflection_completed: 30,
  weekly_review_completed: 40,
  streak_bonus: 25,
};

export const LEAF_LEVEL_MILESTONES = [
  { level: 1, points: 0, name: "Seed Starter" },
  { level: 2, points: 100, name: "Panda Scout" },
  { level: 3, points: 300, name: "Young Sapling" },
  { level: 4, points: 700, name: "Trail Keeper" },
  { level: 5, points: 1200, name: "Forest Friend" },
  { level: 6, points: 2000, name: "Carbon Mapper" },
  { level: 7, points: 3500, name: "Green Guardian" },
  { level: 8, points: 5500, name: "Climate Champion" },
] as const;

function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

function currentLevelMilestone(points: number): (typeof LEAF_LEVEL_MILESTONES)[number] {
  return LEAF_LEVEL_MILESTONES.reduce(
    (current, milestone) => (points >= milestone.points ? milestone : current),
    LEAF_LEVEL_MILESTONES[0],
  );
}

export function getLevelName(totalLeafPoints: number): string {
  return currentLevelMilestone(totalLeafPoints).name;
}

export function getLevelNumber(totalLeafPoints: number): number {
  return currentLevelMilestone(totalLeafPoints).level;
}

export function getNextLevelMilestone(totalLeafPoints: number): (typeof LEAF_LEVEL_MILESTONES)[number] | null {
  return LEAF_LEVEL_MILESTONES.find((milestone) => milestone.points > totalLeafPoints) ?? null;
}

export function getLevelProgress(totalLeafPoints: number): {
  level: number;
  levelName: string;
  nextMilestone: (typeof LEAF_LEVEL_MILESTONES)[number] | null;
  progressPercent: number;
} {
  const current = currentLevelMilestone(totalLeafPoints);
  const next = getNextLevelMilestone(totalLeafPoints);
  if (!next) {
    return { level: current.level, levelName: current.name, nextMilestone: null, progressPercent: 100 };
  }

  const span = next.points - current.points;
  const earnedInLevel = totalLeafPoints - current.points;
  return {
    level: current.level,
    levelName: current.name,
    nextMilestone: next,
    progressPercent: Math.max(0, Math.min(100, (earnedInLevel / span) * 100)),
  };
}

type AwardInput = {
  dayId: string;
  eventType: LeafPointEventType;
  label: string;
  capGroup?: string;
  metadata?: Record<string, unknown>;
  awardedAt?: string;
};

function canAward(existingEvents: LeafPointEvent[], input: AwardInput, awardedAt: string): boolean {
  if (input.metadata?.greenAction === true) {
    return false;
  }

  if (input.eventType === "daily_reflection_completed") {
    return !existingEvents.some(
      (event) =>
        event.eventType === "daily_reflection_completed" && isSameDay(event.awardedAt, awardedAt),
    );
  }

  if (input.eventType === "detail_shared" && input.metadata?.source === "natural_language") {
    const count = existingEvents.filter(
      (event) =>
        event.eventType === "detail_shared" &&
        event.metadata?.source === "natural_language" &&
        isSameDay(event.awardedAt, awardedAt),
    ).length;
    return count < 2;
  }

  if (input.eventType === "profile_detail_added" && input.metadata?.field) {
    const field = String(input.metadata.field);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const currentTime = new Date(awardedAt).getTime();
    return !existingEvents.some((event) => {
      if (event.eventType !== "profile_detail_added") return false;
      if (String(event.metadata?.field) !== field) return false;
      return currentTime - new Date(event.awardedAt).getTime() < THIRTY_DAYS_MS;
    });
  }

  if (input.eventType === "learned_pattern_confirmed" && input.metadata?.patternId) {
    const patternId = String(input.metadata.patternId);
    return !existingEvents.some(
      (event) =>
        event.eventType === "learned_pattern_confirmed" &&
        String(event.metadata?.patternId) === patternId,
    );
  }

  return true;
}

export function awardPoints(
  existingEvents: LeafPointEvent[],
  input: AwardInput,
): { awardedPoints: number; event?: LeafPointEvent } {
  const awardedAt = input.awardedAt ?? new Date().toISOString();
  if (!canAward(existingEvents, input, awardedAt)) {
    return { awardedPoints: 0 };
  }

  const event: LeafPointEvent = {
    id: crypto.randomUUID(),
    dayId: input.dayId,
    eventType: input.eventType,
    points: EVENT_POINTS[input.eventType] ?? 0,
    capGroup: input.capGroup ?? input.eventType,
    label: input.label,
    metadata: input.metadata,
    awardedAt,
  };

  return {
    awardedPoints: event.points,
    event,
  };
}
