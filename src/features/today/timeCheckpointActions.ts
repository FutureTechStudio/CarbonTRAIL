import { buildActivityEntry, finalizeActivityDay } from "@/logic/activityBuilder";
import {
  PRIMARY_CATEGORY_LABELS,
  technicalCategoryForPrimaryCategory,
} from "@/logic/categoryScoring";
import type { ActivityCategory, ActivityDay, ActivityEntry, PrimaryActionCategory, UserProfile } from "@/types";
import { getActivityTimeCheckpointId, type TimeCheckpointDefinition, type TimeCheckpointId } from "@/features/today/timeCheckpoints";

export function isNothingToLogActivity(activity: ActivityEntry): boolean {
  return activity.activityType === "nothing_to_log" || activity.details.nothingToLog === true;
}

export type EditableEventType = PrimaryActionCategory;

export type TimeCheckpointEventInput = {
  id?: string;
  eventType: EditableEventType;
  label?: string;
  details: Record<string, unknown>;
};

const EVENT_LABELS: Record<EditableEventType, string> = PRIMARY_CATEGORY_LABELS;

function eventCategory(type: EditableEventType): ActivityCategory {
  return technicalCategoryForPrimaryCategory(type);
}

function activityType(type: EditableEventType): string {
  return `time_slot_${type}`;
}

function eventTime(checkpoint: TimeCheckpointDefinition): string {
  return `${String(checkpoint.centerHour).padStart(2, "0")}:00`;
}

function checkpointMetadata(checkpoint: TimeCheckpointDefinition): Record<string, unknown> {
  return {
    checkpointId: checkpoint.id,
    eventTime: eventTime(checkpoint),
    loggedTime: eventTime(checkpoint),
    timeWindowStart: checkpoint.startHour,
    timeWindowEnd: checkpoint.endHour,
  };
}

export function saveTimeCheckpointEvent({
  day,
  profile,
  checkpoint,
  input,
}: {
  day: ActivityDay;
  profile: UserProfile;
  checkpoint: TimeCheckpointDefinition;
  input: TimeCheckpointEventInput;
}): ActivityDay {
  const existing = input.id ? day.activities.find((activity) => activity.id === input.id) : undefined;
  const partial: Partial<ActivityEntry> = {
    ...(existing ?? {}),
    checkpointId: checkpoint.id,
    eventTime: eventTime(checkpoint),
    timeWindowStart: checkpoint.startHour,
    timeWindowEnd: checkpoint.endHour,
    category: eventCategory(input.eventType),
    primaryCategory: input.eventType,
    rawPrimaryCategory: EVENT_LABELS[input.eventType],
    subcategory: typeof input.details.subcategory === "string" ? input.details.subcategory : EVENT_LABELS[input.eventType],
    activityType: activityType(input.eventType),
    label: input.label?.trim() || EVENT_LABELS[input.eventType],
    status: "confirmed",
    source: "manual_edit",
    details: {
      ...(existing?.details ?? {}),
      ...checkpointMetadata(checkpoint),
      ...input.details,
      eventType: input.eventType,
    },
  };

  const entry = buildActivityEntry(partial, day.id, profile);
  const activities = existing
    ? day.activities.map((activity) => (activity.id === existing.id ? entry : activity))
    : [...day.activities, entry];

  return finalizeActivityDay(
    {
      ...day,
      status: "mixed",
      activities,
      updatedAt: new Date().toISOString(),
    },
    profile,
  );
}

export function markTimeCheckpointEmpty({
  day,
  profile,
  checkpoint,
}: {
  day: ActivityDay;
  profile: UserProfile;
  checkpoint: TimeCheckpointDefinition;
}): ActivityDay {
  const kept = day.activities.filter((activity) => getActivityTimeCheckpointId(activity) !== checkpoint.id);
  const partial: Partial<ActivityEntry> = {
    checkpointId: checkpoint.id,
    eventTime: eventTime(checkpoint),
    timeWindowStart: checkpoint.startHour,
    timeWindowEnd: checkpoint.endHour,
    category: "special",
    activityType: "nothing_to_log",
    label: "Nothing to log",
    status: "confirmed",
    source: "manual_edit",
    primaryCategory: "other_unknown",
    subcategory: "nothing_to_log",
    details: {
      ...checkpointMetadata(checkpoint),
      nothingToLog: true,
    },
  };

  const entry = buildActivityEntry(partial, day.id, profile);

  return finalizeActivityDay(
    {
      ...day,
      status: "mixed",
      activities: [...kept, entry],
      updatedAt: new Date().toISOString(),
    },
    profile,
  );
}

export function deleteTimeCheckpointEvent({
  day,
  profile,
  activityId,
}: {
  day: ActivityDay;
  profile: UserProfile;
  activityId: string;
}): ActivityDay {
  return finalizeActivityDay(
    {
      ...day,
      status: "mixed",
      activities: day.activities.filter((activity) => activity.id !== activityId),
      updatedAt: new Date().toISOString(),
    },
    profile,
  );
}

export function annotateActivityForCheckpoint(
  activity: ActivityEntry,
  checkpoint: TimeCheckpointDefinition,
): ActivityEntry {
  return {
    ...activity,
    checkpointId: checkpoint.id as TimeCheckpointId,
    eventTime: eventTime(checkpoint),
    timeWindowStart: checkpoint.startHour,
    timeWindowEnd: checkpoint.endHour,
    details: {
      ...activity.details,
      ...checkpointMetadata(checkpoint),
    },
  };
}
