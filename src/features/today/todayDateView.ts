import type { ActivityDay, UserProfile } from "@/types";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalDateSearchParam(value: string | null): string | null {
  if (!value || !DATE_KEY_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

export function formatActivitiesTitle(dateKey: string, todayDate: string): string {
  if (dateKey === todayDate) return "Today's Activities";
  const shortDate = new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `${shortDate} Activities`;
}

export function pandaHelperMessage(dateKey: string, todayDate: string): string {
  if (dateKey === todayDate) {
    return "Let me know what you are doing? I will help you track your carbon trail.";
  }
  return "Let me know what you did? I will help you track your carbon trail.";
}

export function formatJourneyTitle(dateKey: string, todayDate: string): string {
  if (dateKey === todayDate) return "Today's Journey";
  return formatViewDateLabel(dateKey);
}

export function formatJourneySubtitle(dateKey: string, todayDate: string): string {
  if (dateKey === todayDate) return "A circular view of your day";
  return "A circular view of this day";
}

export function parseViewDateFromSearchParam(value: string | null, fallback: string): string {
  if (!value || !DATE_KEY_PATTERN.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return value;
}

export function formatViewDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function shiftDateKey(dateKey: string, days: number): string {
  const next = new Date(`${dateKey}T12:00:00`);
  next.setDate(next.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateKeyShort(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function createEmptyActivityDay(profile: UserProfile, date: string): ActivityDay {
  const dayId = `${profile.id}-${date}`;
  return {
    id: dayId,
    profileId: profile.id,
    date,
    dayType: "unknown",
    status: "empty",
    activities: [],
    totals: {
      createdCo2eKg: 0,
      savedCo2eKg: 0,
      netChangeCo2eKg: 0,
      impactScore: 1,
      confidence: 0.1,
      dataCompleteness: 0,
    },
    visualSummary: {
      trailCondition: "light",
      smokePatches: 0,
      greenPatches: 0,
      treesGrown: 0,
      estimatedNodes: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
