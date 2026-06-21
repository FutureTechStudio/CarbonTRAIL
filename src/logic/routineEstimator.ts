import type { ActivityDay, ActivityEntry, DayType, UserProfile } from "@/types";
import { computeDayConfidence } from "./confidence";
import { computeActivityEstimates, computeDayTotals, trailCondition } from "./factorEngine";
import { buildVisualSummary, mapActivityToVisualEffect } from "./visualMapper";

function isoNow(): string {
  return new Date().toISOString();
}

function weekdayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function inferDayType(profile: UserProfile, date: Date): DayType {
  const dayIndex = date.getDay();
  const name = weekdayName(date);
  if (dayIndex === 0 || dayIndex === 6) {
    return "weekend_home";
  }
  if (profile.routines.workFromHomeDays?.includes(name)) {
    return "weekday_wfh";
  }
  if (
    profile.core.usualWorkMode === "office" ||
    profile.core.usualWorkMode === "hybrid" ||
    profile.routines.officeDays?.includes(name)
  ) {
    return "weekday_office";
  }
  return "unknown";
}

function buildEstimatedActivity(
  dayId: string,
  index: number,
  partial: Pick<ActivityEntry, "category" | "activityType" | "label" | "details">,
): ActivityEntry {
  const timestamp = isoNow();
  const base: ActivityEntry = {
    id: `${dayId}-est-${index}`,
    dayId,
    category: partial.category,
    activityType: partial.activityType,
    label: partial.label,
    status: "estimated_from_profile",
    source: "profile",
    details: {
      ...partial.details,
      estimatedFromProfile: true,
    },
    estimates: {
      co2eKg: 0,
      baselineCo2eKg: 0,
      savedCo2eKg: 0,
      impactScore: 1,
      confidence: 0.55,
      factorRefs: [],
    },
    visualEffect: {
      nodeType: "generic",
      smoke: "none",
      greenery: "none",
      style: "faded_dotted",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const estimates = computeActivityEstimates(base);
  return {
    ...base,
    estimates,
    visualEffect: mapActivityToVisualEffect(base.category, base.status, estimates),
  };
}

export function estimateDayFromProfile(profile: UserProfile, date: string): ActivityDay {
  const dateObj = new Date(`${date}T00:00:00`);
  const dayType = inferDayType(profile, dateObj);
  const dayId = `${profile.id}-${date}`;

  const activities: ActivityEntry[] = [];
  const commuteMode = profile.core.usualCommuteMode ?? "scooter";
  const commuteDistanceKm = profile.core.usualCommuteDistanceKm ?? 0;
  const monthlyKwh = profile.core.monthlyElectricityKwh ?? 0;
  const dailyAcHours = profile.routines.usualEnergyUse?.dailyAcHours ?? 0;

  if (dayType === "weekday_office") {
    activities.push(
      buildEstimatedActivity(dayId, 1, {
        category: "transport",
        activityType: "commute_outbound",
        label: "Morning Commute",
        details: { mode: commuteMode, distanceKm: commuteDistanceKm },
      }),
    );
    activities.push(
      buildEstimatedActivity(dayId, 2, {
        category: "transport",
        activityType: "commute_return",
        label: "Evening Commute",
        details: { mode: commuteMode, distanceKm: commuteDistanceKm },
      }),
    );
  }

  activities.push(
    buildEstimatedActivity(dayId, 3, {
      category: "food",
      activityType: "lunch",
      label: "Lunch",
      details: {
        mealSource: profile.routines.usualLunch?.source ?? "home_cooked",
        foodType: profile.routines.usualLunch?.foodType ?? "vegetarian_low_dairy",
        packaging: "normal",
      },
    }),
  );

  activities.push(
    buildEstimatedActivity(dayId, 4, {
      category: "food",
      activityType: "dinner",
      label: "Dinner",
      details: {
        mealSource: profile.routines.usualDinner?.source ?? "home_cooked",
        foodType: profile.routines.usualDinner?.foodType ?? "veg_dairy",
        packaging: "normal",
      },
    }),
  );

  activities.push(
    buildEstimatedActivity(dayId, 5, {
      category: "energy",
      activityType: "home_energy",
      label: "Home Energy",
      details: {
        monthlyKwh,
        extraAcHours: dailyAcHours,
      },
    }),
  );

  const totals = computeDayTotals(activities);
  const dayConfidence = computeDayConfidence(activities, profile.stats.profileConfidence);
  const dayScore = totals.impactScore;
  const summary = buildVisualSummary(activities, trailCondition(dayScore));
  const timestamp = isoNow();

  return {
    id: dayId,
    profileId: profile.id,
    date,
    dayType,
    status: "auto_filled",
    activities,
    totals: {
      ...totals,
      confidence: dayConfidence,
    },
    visualSummary: summary,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
