import type { ActivityEntry } from "@/types";

export function clamp(value: number, min = 0.05, max = 0.98): number {
  return Math.min(max, Math.max(min, value));
}

export function activityConfidenceByStatus(status: ActivityEntry["status"]): number {
  switch (status) {
    case "confirmed":
      return 0.9;
    case "parsed_pending":
      return 0.75;
    case "assumed":
      return 0.7;
    case "estimated_from_profile":
      return 0.55;
    default:
      return 0.25;
  }
}

export function computeDayConfidence(
  activities: Pick<ActivityEntry, "status">[],
  profileConfidence: number,
): number {
  if (activities.length === 0) {
    return clamp(0.15 + 0.2 * profileConfidence - 0.25);
  }

  const total = activities.length;
  const confirmedShare = activities.filter((a) => a.status === "confirmed").length / total;
  const parsedShare = activities.filter((a) => a.status === "parsed_pending").length / total;
  const estimatedShare = activities.filter((a) => a.status === "estimated_from_profile").length / total;

  const score =
    0.15 +
    0.4 * confirmedShare +
    0.15 * parsedShare +
    0.2 * clamp(profileConfidence, 0, 1) -
    0.25 * estimatedShare;

  return clamp(score);
}
