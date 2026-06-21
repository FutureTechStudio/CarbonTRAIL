import {
  computeActivityEstimates,
  computeDayTotals,
  trailCondition,
} from "@/logic/factorEngine";
import {
  defaultCategoryScoreForActivity,
  inferPrimaryCategoryFromDetails,
  normalizePrimaryCategory,
  normalizeScoreFields,
} from "@/logic/categoryScoring";
import { computeDayConfidence } from "@/logic/confidence";
import { buildVisualSummary, mapActivityToVisualEffect } from "@/logic/visualMapper";
import { inferFlightRouteFromContext, isFlightTransport } from "@/logic/travelInference";
import type { ActivityDay, ActivityEntry, UserProfile } from "@/types";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(dayId: string): string {
  return `${dayId}-${crypto.randomUUID().slice(0, 8)}`;
}

function isCommuteLikeTransport(
  partial: Partial<ActivityEntry>,
  details: Record<string, unknown>,
): boolean {
  const text = `${partial.activityType ?? ""} ${partial.label ?? ""} ${Object.values(details).join(" ")}`;
  return (
    /\bcommute|office|work\b/i.test(text) ||
    details.purpose === "work" ||
    details.tripPurpose === "work" ||
    details.destination === "office"
  );
}

export function buildActivityEntry(
  partial: Partial<ActivityEntry>,
  dayId: string,
  profile: UserProfile,
): ActivityEntry {
  const timestamp = nowIso();
  const details = { ...(partial.details ?? {}) };

  if (partial.category === "transport") {
    const isFlight = isFlightTransport(details, partial.label, partial.activityType);

    if (isFlight) {
      const route = inferFlightRouteFromContext(details, partial.label, partial.activityType);
      Object.assign(details, route);
      if (!details.baselineDistanceKm && typeof details.distanceKm === "number") {
        details.baselineDistanceKm = details.distanceKm;
      }
    } else {
      const commuteLike = isCommuteLikeTransport(partial, details);
      if (commuteLike && !details.baselineMode && profile.core.usualCommuteMode) {
        details.baselineMode = profile.core.usualCommuteMode;
      }
      if (commuteLike && !details.baselineDistanceKm && profile.core.usualCommuteDistanceKm) {
        details.baselineDistanceKm = profile.core.usualCommuteDistanceKm;
      }
      const loggedDistance =
        typeof details.distanceKm === "number" ? details.distanceKm : Number(details.distanceKm ?? NaN);
      if (
        commuteLike &&
        (!Number.isFinite(loggedDistance) || loggedDistance <= 0) &&
        typeof profile.core.usualCommuteDistanceKm === "number" &&
        profile.core.usualCommuteDistanceKm > 0
      ) {
        details.distanceKm = profile.core.usualCommuteDistanceKm;
      }
    }
  }

  if (partial.category === "food") {
    if (!details.baselineFoodType && profile.routines.usualLunch?.foodType) {
      details.baselineFoodType = profile.routines.usualLunch.foodType;
    }
    if (!details.baselineMealSource && profile.routines.usualLunch?.source) {
      details.baselineMealSource = profile.routines.usualLunch.source;
    }
  }

  const base: ActivityEntry = {
    id: partial.id ?? makeId(dayId),
    dayId,
    checkpointId: partial.checkpointId,
    eventTime: partial.eventTime,
    timeWindowStart: partial.timeWindowStart,
    timeWindowEnd: partial.timeWindowEnd,
    category: partial.category ?? "special",
    activityType: partial.activityType ?? "manual_update",
    label: partial.label ?? "Activity update",
    status: partial.status ?? "confirmed",
    source: partial.source ?? "manual_edit",
    details,
    estimates: partial.estimates ?? {
      co2eKg: 0,
      baselineCo2eKg: 0,
      savedCo2eKg: 0,
      impactScore: 1,
      confidence: 0.25,
      factorRefs: [],
    },
    visualEffect: partial.visualEffect ?? {
      nodeType: "generic",
      smoke: "none",
      greenery: "none",
      style: "solid",
    },
    explanation: partial.explanation,
    createdAt: partial.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const estimates = computeActivityEstimates(base);
  const mapping = partial.primaryCategory
    ? normalizePrimaryCategory(partial.primaryCategory, base.category)
    : inferPrimaryCategoryFromDetails(base.category, base.activityType, base.label, details);
  const primaryCategory = partial.primaryCategory ?? mapping.primaryCategory;
  const fallbackScore = defaultCategoryScoreForActivity(primaryCategory, details, estimates.co2eKg);
  const { categoryScore, scoreMeaning } = normalizeScoreFields(
    partial.categoryScore ?? details.categoryScore,
    partial.scoreMeaning ?? details.scoreMeaning,
    fallbackScore,
  );
  const detailsWithMapping = {
    ...details,
    rawAiCategory: details.rawAiCategory ?? partial.rawPrimaryCategory ?? mapping.raw,
    categoryMappingConfidence: details.categoryMappingConfidence ?? mapping.confidence,
    categoryMappingSource: details.categoryMappingSource ?? mapping.source,
  };

  return {
    ...base,
    details: detailsWithMapping,
    primaryCategory,
    rawPrimaryCategory: partial.rawPrimaryCategory ?? mapping.raw,
    subcategory: partial.subcategory ?? (typeof details.subcategory === "string" ? details.subcategory : base.activityType),
    categoryScore,
    greenScore:
      typeof partial.greenScore === "number"
        ? partial.greenScore
        : typeof details.greenScore === "number"
          ? details.greenScore
          : undefined,
    scoreMeaning,
    dominantImpact: partial.dominantImpact,
    parentBundleId: partial.parentBundleId,
    includedInParentContext: partial.includedInParentContext,
    estimates,
    visualEffect: mapActivityToVisualEffect(base.category, base.status, estimates),
  };
}

export function finalizeActivityDay(day: ActivityDay, profile: UserProfile): ActivityDay {
  const totals = computeDayTotals(day.activities);
  const confidence = computeDayConfidence(day.activities, profile.stats.profileConfidence);
  const summary = buildVisualSummary(day.activities, trailCondition(totals.impactScore));

  return {
    ...day,
    totals: {
      ...totals,
      confidence,
    },
    visualSummary: summary,
    updatedAt: nowIso(),
  };
}
