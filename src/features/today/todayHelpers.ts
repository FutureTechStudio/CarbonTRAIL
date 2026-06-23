import type { ActivityDay, ActivityEntry, DayStatus } from "@/types";
import { PRIMARY_CATEGORY_LABELS } from "@/logic/categoryScoring";

const CATEGORY_EMOJI: Record<string, string> = {
  transport: "🛵",
  food: "🍽️",
  energy: "🏠",
  delivery: "📦",
  shopping: "🛍️",
  waste: "♻️",
  digital: "💻",
  special: "🌿",
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Seed Starter",
  2: "Panda Scout",
  3: "Trail Walker",
  4: "Forest Friend",
  5: "Canopy Keeper",
  6: "Valley Guide",
  7: "Climate Companion",
  8: "Trail Guardian",
};

export type CarbonChoiceItem = {
  key: string;
  label: string;
  emoji: string;
  status: "Confirmed" | "Estimated" | "Missing" | "Assumed" | "Not logged";
  categories: ActivityEntry["category"][];
};

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getActivityEmoji(activity: ActivityEntry): string {
  if (activity.activityType === "nothing_to_log" || activity.details.nothingToLog === true) {
    return "✓";
  }
  if (activity.category === "transport") {
    const mode = String(activity.details.mode ?? (activity.label.toLowerCase().includes("flight") ? "flight" : ""));
    if (mode === "walk") return "🚶";
    if (mode === "cycle") return "🚲";
    if (mode === "bus") return "🚌";
    if (mode === "metro") return "🚇";
    if (mode === "car") return "🚗";
    if (mode === "flight") return "✈️";
    return "🛵";
  }
  if (activity.category === "energy" && activity.activityType.includes("office")) return "💻";
  return CATEGORY_EMOJI[activity.category] ?? "🌿";
}

export function getActivityPrimaryCategoryLabel(activity: ActivityEntry): string {
  if (activity.primaryCategory) return PRIMARY_CATEGORY_LABELS[activity.primaryCategory];
  return titleCase(activity.category);
}

export function formatActivityTypeLine(activity: ActivityEntry): string {
  const details = activity.details;

  if (activity.activityType === "nothing_to_log" || details.nothingToLog === true) {
    return "Nothing to log for this checkpoint.";
  }

  if (activity.category === "transport") {
    const inferredMode = activity.label.toLowerCase().includes("flight") ? "flight" : "commute";
    const mode = titleCase(String(details.mode ?? inferredMode));
    const distance = details.distanceKm;
    if (typeof distance === "number") {
      const suffix =
        details.mode === "flight" || inferredMode === "flight"
          ? ""
          : details.assumedSameAsMorning
            ? " return"
            : " each way";
      return `${mode} · ${distance} km${suffix}`;
    }
    return mode;
  }

  if (activity.category === "food") {
    const parts: string[] = [];
    if (details.mealSource) parts.push(titleCase(String(details.mealSource)));
    if (details.foodType) parts.push(titleCase(String(details.foodType)));
    if (details.travelMode && details.travelDistanceKm) {
      parts.unshift(`Walked ${details.travelDistanceKm} km`);
    }
    if (parts.length > 0) return parts.join(" · ");
  }

  if (activity.category === "energy") {
    if (details.location) {
      return `${titleCase(String(details.location))}${details.estimatedFromProfile ? " (estimated)" : ""}`;
    }
    if (details.acHours) return `Home AC · ${details.acHours} hrs`;
    if (details.durationHours) return `Office · ${details.durationHours} hrs`;
  }

  if (activity.status === "estimated_from_profile") {
    return `${activity.label} (estimated from profile)`;
  }

  return titleCase(activity.activityType);
}

export function getWhyItMatters(activity: ActivityEntry): string {
  if (activity.explanation?.trim()) return activity.explanation;

  if (activity.category === "transport" && activity.estimates.impactScore >= 6) {
    return "Your usual commute route is one of today's biggest smoke sources.";
  }
  if (activity.category === "food") {
    if (activity.status === "estimated_from_profile") {
      return "Meals shape your daily food footprint. Confirm this if lunch was different today.";
    }
    if (activity.estimates.savedCo2eKg > 0) {
      return "This meal choice reduced food-related emissions compared to your baseline.";
    }
  }
  if (activity.category === "energy" && activity.estimates.impactScore >= 5) {
    return "Energy use here can add haze to your evening trail if it runs longer than usual.";
  }
  if (activity.status === "estimated_from_profile") {
    return "Panda filled this from your Carbon Memory — confirm it to sharpen today's trail.";
  }

  return "Sharing accurate details here helps Panda learn your real routine.";
}

export function getDayStatusLabel(status: DayStatus): string {
  if (status === "auto_filled") return "Auto-filled";
  if (status === "confirmed") return "Confirmed";
  if (status === "mixed") return "Mixed";
  return "In progress";
}

export function getDayStatusBadgeLabel(status: DayStatus): string {
  if (status === "confirmed") return "Confirmed day";
  if (status === "auto_filled") return "Auto-filled";
  return `${getDayStatusLabel(status)} day`;
}

export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? `Level ${level}`;
}

export function isLowConfidenceDay(confidence: number, status: DayStatus): boolean {
  return status === "auto_filled" || confidence < 0.35;
}

export function getPandaInsight(day: ActivityDay, confidence: number): string {
  const topSmoke = [...day.activities]
    .sort((a, b) => b.estimates.impactScore - a.estimates.impactScore)[0];

  if (isLowConfidenceDay(confidence, day.status)) {
    return "Panda filled today from your Carbon Memory. Confirm your commute, meals, and energy use to sharpen the trail.";
  }

  if (day.status === "confirmed" || confidence >= 0.7) {
    const source =
      topSmoke?.category === "transport"
        ? "commute"
        : topSmoke?.category === "food"
          ? "meals"
          : topSmoke?.category === "energy"
            ? "energy use"
            : "daily choices";
    return `Nice — your trail is mostly confirmed. The biggest smoke source today is ${source}.`;
  }

  return "Today was a smoky trail, but sharing details helps Panda improve your Carbon Memory.";
}

/** @deprecated Use getPandaInsight */
export const getSproutInsight = getPandaInsight;

export function getSmartNudge(day: ActivityDay, confidence: number): string {
  if (isLowConfidenceDay(confidence, day.status)) {
    return "Your trail is estimated right now. Confirming even 3 details can improve today's confidence.";
  }

  return "High AC use or food delivery can add extra haze. Compare alternatives before finalizing today.";
}

export type PandaNextBestAction = {
  summary: string;
  nextStep: string;
  ctaLabel: string;
};

export function getPandaNextBestAction(
  day: ActivityDay,
  confidence: number,
  choices: CarbonChoiceItem[],
): PandaNextBestAction {
  const insight = getPandaInsight(day, confidence);
  const missing = choices.filter((choice) => choice.status === "Missing");
  const estimated = choices.filter((choice) => choice.status === "Estimated" || choice.status === "Assumed");
  const confirmed = choices.filter((choice) => choice.status === "Confirmed");

  let nextStep = getSmartNudge(day, confidence);
  if (missing.length > 0) {
    const labels = missing.map((choice) => choice.label.toLowerCase()).join(", ");
    nextStep = `${labels} still missing. Add that detail to improve today's confidence.`;
  } else if (estimated.length > 0) {
    nextStep = `Confirm ${estimated.map((choice) => choice.label.toLowerCase()).join(" and ")} to sharpen today's trail.`;
  } else if (confirmed.length === choices.length) {
    nextStep = "Your main choices look complete. Ask Panda if anything changed later today.";
  }

  const confirmedLabels =
    confirmed.length > 0 ? confirmed.map((choice) => choice.label.toLowerCase()).join(", ") : null;
  const summary =
    confirmedLabels && missing.length > 0
      ? `${insight} ${confirmedLabels.charAt(0).toUpperCase()}${confirmedLabels.slice(1)} are confirmed.`
      : insight;

  return {
    summary,
    nextStep,
    ctaLabel: "Ask Panda",
  };
}

function choiceStatus(activities: ActivityEntry[]): CarbonChoiceItem["status"] {
  if (activities.length === 0) return "Missing";
  if (activities.some((item) => item.status === "confirmed")) return "Confirmed";
  if (activities.some((item) => item.status === "assumed")) return "Assumed";
  if (activities.some((item) => item.status === "estimated_from_profile")) return "Estimated";
  return "Not logged";
}

export function getCarbonChoices(activities: ActivityEntry[]): CarbonChoiceItem[] {
  const groups: CarbonChoiceItem[] = [
    { key: "travel", label: "Travel", emoji: "🛵", status: "Missing", categories: ["transport"] },
    { key: "meals", label: "Meals", emoji: "🍽️", status: "Missing", categories: ["food"] },
    { key: "energy", label: "Energy", emoji: "🏠", status: "Missing", categories: ["energy"] },
    {
      key: "delivery",
      label: "Delivery / Shopping",
      emoji: "📦",
      status: "Missing",
      categories: ["delivery", "shopping"],
    },
    { key: "waste", label: "Waste", emoji: "♻️", status: "Missing", categories: ["waste"] },
  ];

  return groups.map((group) => ({
    ...group,
    status:
      group.key === "delivery"
        ? activities.some((item) => group.categories.includes(item.category))
          ? choiceStatus(activities.filter((item) => group.categories.includes(item.category)))
          : "Not logged"
        : choiceStatus(activities.filter((item) => group.categories.includes(item.category))),
  }));
}

export function countDataQuality(activities: ActivityEntry[]) {
  return activities.reduce(
    (acc, item) => {
      if (item.status === "confirmed") acc.confirmed += 1;
      else if (item.status === "assumed") acc.assumed += 1;
      else if (item.status === "estimated_from_profile") acc.estimated += 1;
      return acc;
    },
    { confirmed: 0, assumed: 0, estimated: 0 },
  );
}

export function buildShareText(
  createdKg: number,
  confidence: number,
  greenImpactKg: number,
): string {
  return [
    "My CarbonTrail today 🌿",
    `Created: ${createdKg.toFixed(1)} kg CO₂`,
    `Confidence: ${Math.round(confidence * 100)}%`,
    `Green Impact: ${greenImpactKg.toFixed(2)} kg saved`,
    "I'm making my daily footprint visible with CarbonTrail AI.",
  ].join("\n");
}

export async function shareTodayTrail(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text, title: "My CarbonTrail Today" });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return false;
}

export function getConfidenceMetricSub(confidence: number, confirmedCount: number): string {
  if (confidence < 0.35) return "Needs confirmation";
  return `${confirmedCount} confirmed activities`;
}
