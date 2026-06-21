import type { ActivityDay, ActivityEntry } from "@/types";
import { clamp } from "@/logic/confidence";

const USER_LOGGED_SOURCES = new Set<ActivityEntry["source"]>(["chip", "free_text", "manual_edit"]);

export function isUserLoggedActivity(activity: Pick<ActivityEntry, "source" | "status">): boolean {
  if (activity.status === "parsed_pending") return false;
  return USER_LOGGED_SOURCES.has(activity.source);
}

export function dayHasLoggedEvents(day: Pick<ActivityDay, "activities">): boolean {
  return day.activities.some(isUserLoggedActivity);
}

export function computeLoggedDayProfileConfidence(days: Record<string, ActivityDay>): number {
  const loggedDayCount = Object.values(days).filter(dayHasLoggedEvents).length;
  if (loggedDayCount === 0) return 0.1;

  const progress = 1 - Math.exp(-loggedDayCount / 10);
  return clamp(0.1 + progress * 0.88, 0.1, 0.98);
}
