import type { ActivityCategory, PrimaryActionCategory, ScoreMeaning } from "@/types";

export const PRIMARY_ACTION_CATEGORIES: PrimaryActionCategory[] = [
  "transportation",
  "food_meals",
  "home_energy",
  "cooking_energy",
  "work_study",
  "shopping_purchases",
  "delivery_online_orders",
  "waste_recycling",
  "water_hot_water",
  "digital_devices",
  "personal_care",
  "household_chores",
  "social_leisure",
  "travel_trips",
  "positive_avoided_actions",
  "other_unknown",
];

export type CategoryMapping = {
  primaryCategory: PrimaryActionCategory;
  technicalCategory: ActivityCategory;
  confidence: number;
  source: "exact" | "synonym" | "technical" | "fallback";
  raw?: string;
};

export const PRIMARY_CATEGORY_LABELS: Record<PrimaryActionCategory, string> = {
  transportation: "Transportation",
  food_meals: "Food & Meals",
  home_energy: "Home Energy",
  cooking_energy: "Cooking Energy",
  work_study: "Work / Study",
  shopping_purchases: "Shopping & Purchases",
  delivery_online_orders: "Delivery & Online Orders",
  waste_recycling: "Waste & Recycling",
  water_hot_water: "Water & Hot Water",
  digital_devices: "Digital & Devices",
  personal_care: "Personal Care",
  household_chores: "Household Chores",
  social_leisure: "Social & Leisure",
  travel_trips: "Travel & Trips",
  positive_avoided_actions: "Positive / Avoided Actions",
  other_unknown: "Other / Unknown",
};

const PRIMARY_TO_TECHNICAL: Record<PrimaryActionCategory, ActivityCategory> = {
  transportation: "transport",
  food_meals: "food",
  home_energy: "energy",
  cooking_energy: "energy",
  work_study: "energy",
  shopping_purchases: "shopping",
  delivery_online_orders: "delivery",
  waste_recycling: "waste",
  water_hot_water: "energy",
  digital_devices: "digital",
  personal_care: "special",
  household_chores: "special",
  social_leisure: "special",
  travel_trips: "transport",
  positive_avoided_actions: "special",
  other_unknown: "special",
};

const TECHNICAL_TO_PRIMARY: Record<ActivityCategory, PrimaryActionCategory> = {
  transport: "transportation",
  food: "food_meals",
  energy: "home_energy",
  delivery: "delivery_online_orders",
  shopping: "shopping_purchases",
  waste: "waste_recycling",
  digital: "digital_devices",
  special: "other_unknown",
};

const CATEGORY_SYNONYMS: Record<PrimaryActionCategory, string[]> = {
  transportation: ["transport", "transportation", "mobility", "commute", "commuting", "vehicle", "ride"],
  food_meals: ["food", "meal", "meals", "breakfast", "lunch", "dinner", "snack", "drink"],
  home_energy: ["home energy", "electricity", "power", "ac", "heater", "geyser", "appliance"],
  cooking_energy: ["cooking", "cooking energy", "lpg", "stove", "induction", "microwave", "oven"],
  work_study: ["work", "study", "office", "school", "college", "occupation"],
  shopping_purchases: ["shopping", "purchase", "purchases", "buying", "bought", "retail"],
  delivery_online_orders: ["delivery", "online order", "parcel", "quick commerce", "food delivery", "logistics"],
  waste_recycling: ["waste", "recycling", "recycle", "compost", "trash", "garbage", "disposal"],
  water_hot_water: ["water", "hot water", "shower", "bath", "laundry", "dishwashing", "car wash"],
  digital_devices: ["digital", "device", "devices", "streaming", "gaming", "video call", "laptop", "phone"],
  personal_care: ["personal care", "hygiene", "salon", "hair dryer", "cosmetics", "shaving"],
  household_chores: ["chores", "household", "cleaning", "maintenance", "vacuum", "ironing"],
  social_leisure: ["social", "leisure", "movie", "mall", "party", "wedding", "festival", "gym"],
  travel_trips: ["travel", "trip", "trips", "flight", "aviation", "air travel", "vacation", "hotel", "intercity"],
  positive_avoided_actions: ["positive", "avoided", "saved", "reduced", "instead", "reused", "repaired"],
  other_unknown: ["other", "unknown", "unclear", "misc", "miscellaneous"],
};

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function scoreMeaningFromScore(score: number): ScoreMeaning {
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  if (score <= 8) return "high";
  return "very_high";
}

export function clampCategoryScore(score: unknown): number {
  const numeric = typeof score === "number" && Number.isFinite(score) ? score : 0;
  return Math.max(0, Math.min(10, Math.round(numeric)));
}

export function technicalCategoryForPrimaryCategory(primaryCategory: PrimaryActionCategory): ActivityCategory {
  return PRIMARY_TO_TECHNICAL[primaryCategory];
}

export function defaultPrimaryCategoryForTechnicalCategory(category: ActivityCategory): PrimaryActionCategory {
  return TECHNICAL_TO_PRIMARY[category] ?? "other_unknown";
}

export function normalizePrimaryCategory(raw: unknown, technicalCategory?: ActivityCategory): CategoryMapping {
  const rawString = typeof raw === "string" ? raw : "";
  const normalized = normalizeToken(rawString);

  if (PRIMARY_ACTION_CATEGORIES.includes(normalized as PrimaryActionCategory)) {
    const primaryCategory = normalized as PrimaryActionCategory;
    return {
      primaryCategory,
      technicalCategory: technicalCategoryForPrimaryCategory(primaryCategory),
      confidence: 1,
      source: "exact",
      raw: rawString || primaryCategory,
    };
  }

  for (const [primaryCategory, synonyms] of Object.entries(CATEGORY_SYNONYMS) as Array<
    [PrimaryActionCategory, string[]]
  >) {
    if (synonyms.some((synonym) => normalized.includes(normalizeToken(synonym)))) {
      return {
        primaryCategory,
        technicalCategory: technicalCategoryForPrimaryCategory(primaryCategory),
        confidence: 0.82,
        source: "synonym",
        raw: rawString,
      };
    }
  }

  if (technicalCategory) {
    const primaryCategory = defaultPrimaryCategoryForTechnicalCategory(technicalCategory);
    return {
      primaryCategory,
      technicalCategory,
      confidence: technicalCategory === "special" ? 0.45 : 0.74,
      source: "technical",
      raw: rawString || technicalCategory,
    };
  }

  return {
    primaryCategory: "other_unknown",
    technicalCategory: "special",
    confidence: 0.2,
    source: "fallback",
    raw: rawString,
  };
}

export function inferPrimaryCategoryFromDetails(
  category: ActivityCategory,
  activityType: string,
  label: string,
  details: Record<string, unknown> = {},
): CategoryMapping {
  const text = `${activityType} ${label} ${Object.values(details).join(" ")}`;

  if (category === "transport" && /flight|airport|intercity|trip|hotel|vacation/i.test(text)) {
    return normalizePrimaryCategory("travel_trips", category);
  }
  if (category === "special" && /car wash|laundry|dishwash|shower|bath|water/i.test(text)) {
    return normalizePrimaryCategory("water_hot_water", category);
  }
  if (category === "special" && /walked instead|avoided|reused|repaired|saved|reduced/i.test(text)) {
    return normalizePrimaryCategory("positive_avoided_actions", category);
  }
  if (category === "energy" && /office|work|study|school|college/i.test(text)) {
    return normalizePrimaryCategory("work_study", category);
  }

  return normalizePrimaryCategory(undefined, category);
}

export function defaultCategoryScoreForActivity(
  primaryCategory: PrimaryActionCategory,
  details: Record<string, unknown> = {},
  co2eKg = 0,
): number {
  if (primaryCategory === "positive_avoided_actions") {
    return clampCategoryScore(co2eKg >= 3 ? 8 : co2eKg >= 1 ? 6 : co2eKg > 0 ? 3 : 1);
  }

  if (primaryCategory === "transportation" || primaryCategory === "travel_trips") {
    const mode = String(details.mode ?? "").toLowerCase();
    if (mode === "walk" || mode === "cycle") return 1;
    if (mode === "bus" || mode === "metro" || mode === "train") return primaryCategory === "travel_trips" ? 4 : 3;
    if (mode === "scooter" || mode === "auto") return 5;
    if (mode === "car" || mode === "cab") return 7;
    if (mode === "flight") return primaryCategory === "travel_trips" ? 9 : 10;
  }

  if (primaryCategory === "food_meals") {
    const foodType = String(details.foodType ?? "").toLowerCase();
    const mealSource = String(details.mealSource ?? "").toLowerCase();
    const subcategory = `${details.subcategory ?? ""} ${details.subcategoryLabel ?? ""} ${details.mealType ?? ""}`.toLowerCase();
    if (subcategory.includes("tea") || subcategory.includes("snack")) {
      if (String(details.packaging ?? "").toLowerCase().includes("plastic")) return 4;
      return foodType === "veg_dairy" ? 3 : 2;
    }
    if (foodType === "red_meat") return 8;
    if (mealSource === "ordered_online") return 7;
    if (foodType === "chicken_fish") return 6;
    if (foodType === "egg" || foodType === "veg_dairy") return 4;
    if (foodType === "plant_based" || foodType === "vegetarian_low_dairy") return 2;
  }

  if (primaryCategory === "digital_devices") {
    const subcategory = String(details.subcategory ?? details.deviceType ?? "").toLowerCase();
    const hours = Number(details.durationHours ?? 0);
    if (subcategory.includes("phone") && hours <= 1) return 1;
    if (subcategory.includes("laptop") && hours <= 2) return 2;
    if (subcategory.includes("tv") || subcategory.includes("stream")) {
      if (hours >= 6) return 6;
      if (hours >= 1) return 3;
      return 2;
    }
    if (subcategory.includes("gaming")) return hours >= 4 ? 7 : 6;
    if (hours >= 6) return 6;
    if (hours >= 2) return 4;
    if (hours > 0) return 2;
  }

  if (primaryCategory === "home_energy" || primaryCategory === "water_hot_water") {
    const hours = Number(details.extraAcHours ?? details.durationHours ?? 0);
    if (hours >= 6) return 8;
    if (hours >= 3) return 6;
    if (hours > 0) return 4;
  }

  if (primaryCategory === "delivery_online_orders") {
    const packaging = String(details.packaging ?? "").toLowerCase();
    const deliveryType = String(details.deliveryType ?? "").toLowerCase();
    if (packaging === "plastic_heavy" || deliveryType.includes("express")) return 7;
    if (deliveryType === "foodDelivery" || deliveryType === "quickCommerce") return 6;
    return 4;
  }

  if (primaryCategory === "waste_recycling") {
    const wasteType = String(details.wasteType ?? "").toLowerCase();
    if (wasteType.includes("recycled") || wasteType.includes("compost")) return 1;
    if (wasteType.includes("plastic") || wasteType.includes("food")) return 5;
    return 3;
  }

  if (co2eKg > 6) return 9;
  if (co2eKg > 3) return 7;
  if (co2eKg > 1.5) return 5;
  if (co2eKg > 0.5) return 3;
  return co2eKg > 0 ? 2 : 1;
}

export function normalizeScoreFields(
  score: unknown,
  scoreMeaning: unknown,
  fallbackScore: number,
): { categoryScore: number; scoreMeaning: ScoreMeaning } {
  const categoryScore = clampCategoryScore(typeof score === "number" ? score : fallbackScore);
  const normalizedMeaning = typeof scoreMeaning === "string" ? normalizeToken(scoreMeaning) : "";
  const meaning: ScoreMeaning =
    normalizedMeaning === "low" ||
    normalizedMeaning === "medium" ||
    normalizedMeaning === "high" ||
    normalizedMeaning === "very_high"
      ? (normalizedMeaning as ScoreMeaning)
      : scoreMeaningFromScore(categoryScore);
  return { categoryScore, scoreMeaning: meaning };
}
