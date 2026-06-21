import type { ActivityEntry, TrailCondition, VisualEffect, VisualSummary } from "@/types";

function smokeFromCo2e(co2eKg: number): VisualEffect["smoke"] {
  if (co2eKg <= 0.1) return "none";
  if (co2eKg <= 1) return "low";
  if (co2eKg <= 2.5) return "medium";
  return "high";
}

function greeneryFromSaved(savedCo2eKg: number): VisualEffect["greenery"] {
  if (savedCo2eKg <= 0.01) return "none";
  if (savedCo2eKg <= 0.3) return "small";
  if (savedCo2eKg <= 0.8) return "medium";
  return "high";
}

function nodeTypeFromCategory(category: ActivityEntry["category"]): VisualEffect["nodeType"] {
  switch (category) {
    case "transport":
      return "road";
    case "food":
      return "food_patch";
    case "energy":
      return "house_haze";
    case "delivery":
    case "shopping":
      return "parcel";
    case "waste":
      return "soil";
    default:
      return "generic";
  }
}

function styleFromStatus(status: ActivityEntry["status"]): VisualEffect["style"] {
  if (status === "confirmed") return "solid";
  if (status === "assumed") return "amber_outline";
  return "faded_dotted";
}

export function mapActivityToVisualEffect(
  category: ActivityEntry["category"],
  status: ActivityEntry["status"],
  estimates: ActivityEntry["estimates"],
): VisualEffect {
  return {
    nodeType: nodeTypeFromCategory(category),
    smoke: smokeFromCo2e(estimates.co2eKg),
    greenery: greeneryFromSaved(estimates.savedCo2eKg),
    style: styleFromStatus(status),
  };
}

export function buildVisualSummary(
  activities: Pick<ActivityEntry, "status" | "estimates">[],
  dayTrailCondition: TrailCondition,
): VisualSummary {
  let smokePatches = 0;
  let greenPatches = 0;
  let estimatedNodes = 0;
  let totalSaved = 0;

  for (const activity of activities) {
    if (activity.estimates.co2eKg > 0.1) {
      smokePatches += 1;
    }
    if (activity.estimates.savedCo2eKg > 0.05) {
      greenPatches += 1;
    }
    if (activity.status === "estimated_from_profile") {
      estimatedNodes += 1;
    }
    totalSaved += activity.estimates.savedCo2eKg;
  }

  return {
    trailCondition: dayTrailCondition,
    smokePatches,
    greenPatches,
    treesGrown: Math.max(0, Math.floor(totalSaved / 1)),
    estimatedNodes,
  };
}
