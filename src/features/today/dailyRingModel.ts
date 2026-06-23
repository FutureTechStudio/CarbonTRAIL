import { getActivityEmoji } from "@/features/today/todayHelpers";
import type { ActivityEntry } from "@/types";
import { isNothingToLogActivity } from "@/features/today/timeCheckpointActions";
import {
  getActivityTimeCheckpointId,
  TIME_CHECKPOINTS,
  type ExpectedEventType,
  type TimeCheckpointDefinition,
  type TimeCheckpointId,
} from "@/features/today/timeCheckpoints";

export type TimeCheckpointStatus =
  | "confirmed"
  | "assumed"
  | "predicted"
  | "estimated"
  | "missing"
  | "mixed"
  | "empty";

export type TimeCheckpoint = TimeCheckpointDefinition & {
  events: ActivityEntry[];
  status: TimeCheckpointStatus;
  confidence: number;
  totalKg: number;
  icons: string[];
  eventCount: number;
};

function eventStatus(activity: ActivityEntry): Exclude<TimeCheckpointStatus, "mixed" | "missing" | "empty"> {
  if (activity.status === "confirmed") return "confirmed";
  if (activity.status === "assumed") return "assumed";
  if (activity.status === "parsed_pending") return "predicted";
  return "estimated";
}

export function isPredictedActivity(activity: ActivityEntry): boolean {
  return activity.status === "parsed_pending";
}

export function isEstimatedActivity(activity: ActivityEntry): boolean {
  return activity.status === "estimated_from_profile";
}

export function needsActivityConfirmation(activity: ActivityEntry): boolean {
  return isPredictedActivity(activity) || isEstimatedActivity(activity);
}

function checkpointStatus(events: ActivityEntry[], expectedEventTypes: ExpectedEventType[]): TimeCheckpointStatus {
  if (events.length === 0) return expectedEventTypes.length > 0 ? "missing" : "empty";

  const loggedEvents = events.filter((event) => !isNothingToLogActivity(event));
  if (loggedEvents.length === 0) return "empty";

  const statuses = new Set(loggedEvents.map(eventStatus));
  if (statuses.size === 1) return [...statuses][0];
  return "mixed";
}

function checkpointConfidence(events: ActivityEntry[]): number {
  if (events.length === 0) return 0;
  const total = events.reduce((sum, event) => sum + (event.estimates.confidence ?? 0), 0);
  return total / events.length;
}

export function buildTimeCheckpoints(activities: ActivityEntry[]): TimeCheckpoint[] {
  const byCheckpoint = new Map<TimeCheckpointId, ActivityEntry[]>();

  for (const activity of activities) {
    const checkpointId = getActivityTimeCheckpointId(activity);
    const bucket = byCheckpoint.get(checkpointId) ?? [];
    bucket.push(activity);
    byCheckpoint.set(checkpointId, bucket);
  }

  return TIME_CHECKPOINTS.map((definition) => {
    const events = byCheckpoint.get(definition.id) ?? [];
    const status = checkpointStatus(events, definition.expectedEventTypes);
    const icons = events.filter((event) => !isNothingToLogActivity(event)).map(getActivityEmoji).slice(0, 3);

    return {
      ...definition,
      events,
      status,
      confidence: checkpointConfidence(events),
      totalKg: Math.round(events.reduce((sum, event) => sum + event.estimates.co2eKg, 0) * 100) / 100,
      icons,
      eventCount: events.length,
    };
  });
}

export function reviewedCheckpointCount(checkpoints: TimeCheckpoint[]): number {
  return checkpoints.filter((checkpoint) => checkpoint.status !== "missing" && checkpoint.status !== "empty").length;
}

export function nextRecommendedCheckpoint(checkpoints: TimeCheckpoint[]): TimeCheckpoint {
  return (
    checkpoints.find((checkpoint) => checkpoint.status === "missing" || checkpoint.status === "estimated") ??
    checkpoints.find((checkpoint) => checkpoint.status === "empty") ??
    checkpoints[0]
  );
}

export function categoryFromExpectedType(type: ExpectedEventType): ActivityEntry["category"] {
  if (type === "travel" || type === "exercise" || type === "social") return "transport";
  if (type === "meal") return "food";
  if (type === "delivery") return "delivery";
  if (type === "energy" || type === "digital" || type === "work") return "energy";
  if (type === "waste") return "waste";
  return "special";
}
