import type { PrimaryActionCategory } from "@/types";
import type { CheckpointSlotId, PandaActivityFragment } from "@/ai/pandaSchemas";
import { scoreMeaningFromScore } from "@/logic/categoryScoring";

const CHECKPOINT_IDS = ["01", "03", "05", "07", "09", "11", "13", "15", "17", "19", "21", "23"] as const;

export type PandaDetectedFragment = {
  fragmentText: string;
  primaryCategory: PrimaryActionCategory;
  eventTime: string | null;
  timeCheckpointId: string | null;
  timeSlot: CheckpointSlotId;
  confidence: number;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hasAny(text: string, needles: string[]): boolean {
  const normalized = text.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

export function parseEventTime(text: string, fallbackTime: string | null = null): string | null {
  const match = text
    .toLowerCase()
    .match(/\b(?:around|at|by|after|before)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!match) return fallbackTime;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeToCheckpointId(time: string | null): string | null {
  if (!time) return null;
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? 0);
  if (!Number.isFinite(hours)) return null;
  const decimalHour = hours + minutes / 60;

  let best: string = CHECKPOINT_IDS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of CHECKPOINT_IDS) {
    const checkpointHour = Number(id);
    const distance = Math.abs(decimalHour - checkpointHour);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

export function checkpointIdToSlot(checkpointId: string | null, fragmentText = ""): CheckpointSlotId {
  const text = fragmentText.toLowerCase();
  if (hasAny(text, ["breakfast"])) return "breakfast";
  if (hasAny(text, ["lunch"])) return "lunch";
  if (hasAny(text, ["dinner", "supper"])) return "dinner";
  if (hasAny(text, ["office", "commute"])) {
    const hour = Number(checkpointId ?? "09");
    return hour >= 15 ? "evening_commute" : "morning_commute";
  }
  if (hasAny(text, ["bus", "metro", "scooter", "cab", "car", "walked", "cycled", "drove"])) {
    const hour = Number(checkpointId ?? "15");
    return hour < 12 ? "morning_commute" : hour >= 18 ? "evening_commute" : "afternoon_activity";
  }
  if (hasAny(text, ["ac", "tv", "stream", "gaming"])) {
    const hour = Number(checkpointId ?? "17");
    return hour >= 19 ? "night_energy" : "afternoon_activity";
  }
  if (hasAny(text, ["ordered", "delivery", "parcel", "bought", "shopping"])) return "shopping_delivery";
  if (hasAny(text, ["waste", "threw", "plastic", "recycled", "compost"])) return "waste_final";
  if (hasAny(text, ["work", "study", "school", "college"])) return "work_study";

  const hour = Number(checkpointId ?? "12");
  if (hour < 7) return "morning_start";
  if (hour < 9) return "breakfast";
  if (hour < 12) return "morning_commute";
  if (hour < 15) return "lunch";
  if (hour < 18) return "afternoon_activity";
  if (hour < 20) return "dinner";
  return "night_energy";
}

function splitOnActivityBoundaries(message: string): string[] {
  const text = normalizeText(message)
    .replace(/[.;]+/g, " | ")
    .replace(/,\s+(?=(?:then|after that|and|i |we )?\b(?:had|ate|took|used|watched|worked|ordered|threw|walked|bought|went|recycled)\b)/gi, " | ")
    .replace(/\s+(?:and then|then|after that)\s+/gi, " | ")
    .replace(
      /\s+and\s+(?=\b(?:i |we )?(?:had|ate|took|used|watched|worked|ordered|threw|walked|bought|went|recycled)\b)/gi,
      " | ",
    );

  return text
    .split("|")
    .map((part) => normalizeText(part.replace(/^(?:i|we)\s+/i, "")))
    .filter(Boolean);
}

export function detectPrimaryCategories(fragmentText: string, fullMessage = fragmentText): PrimaryActionCategory[] {
  const text = `${fragmentText} ${fullMessage}`.toLowerCase();
  const categories: PrimaryActionCategory[] = [];

  if (hasAny(text, ["flight", "airport", "flew", "hotel", "intercity", "road trip"])) categories.push("travel_trips");
  if (hasAny(fragmentText.toLowerCase(), ["bus", "metro", "scooter", "auto", "cab", "taxi", "carpool", "walked", "cycle", "commute"])) {
    categories.push("transportation");
  }
  if (hasAny(text, ["breakfast", "lunch", "dinner", "tea", "coffee", "chai", "biscuit", "snack", "biryani", "meal", "canteen", "restaurant"])) {
    categories.push("food_meals");
  }
  if (hasAny(text, ["ordered", "delivery", "swiggy", "zomato", "parcel", "quick commerce"])) categories.push("delivery_online_orders");
  if (hasAny(text, ["ac", "air conditioner", "geyser", "heater", "fan", "lights"])) categories.push("home_energy");
  if (hasAny(text, ["worked", "work from home", "office", "study", "school", "college"])) categories.push("work_study");
  if (hasAny(text, ["tv", "television", "streaming", "netflix", "laptop", "phone", "gaming", "video call"])) categories.push("digital_devices");
  if (hasAny(text, ["bought", "market", "groceries", "vegetables", "shopping", "purchase"])) categories.push("shopping_purchases");
  if (hasAny(text, ["waste", "threw", "plastic", "packaging", "recycled", "compost"])) categories.push("waste_recycling");
  if (hasAny(text, ["shower", "bath", "laundry", "dishwashing", "car wash"])) categories.push("water_hot_water");
  if (hasAny(text, ["party", "wedding", "festival", "movie", "mall", "concert"])) categories.push("social_leisure");

  return categories.length ? [...new Set(categories)] : ["other_unknown"];
}

export function detectActivityFragments(message: string, fallbackTime: string | null = null): PandaDetectedFragment[] {
  const fragments = splitOnActivityBoundaries(message);
  const sharedTime = parseEventTime(message, fallbackTime);
  const detected: PandaDetectedFragment[] = [];

  for (const fragmentText of fragments) {
    const eventTime = parseEventTime(fragmentText, sharedTime);
    const timeCheckpointId = timeToCheckpointId(eventTime);
    for (const primaryCategory of detectPrimaryCategories(fragmentText, message)) {
      detected.push({
        fragmentText,
        primaryCategory,
        eventTime,
        timeCheckpointId,
        timeSlot: checkpointIdToSlot(timeCheckpointId, fragmentText),
        confidence: primaryCategory === "other_unknown" ? 0.45 : 0.86,
      });
    }
  }

  return detected;
}

export function detectedFragmentToActivityFragment(
  fragment: PandaDetectedFragment,
  overrides: Partial<PandaActivityFragment> = {},
): PandaActivityFragment {
  const score = overrides.score ?? 3;
  return {
    fragmentText: fragment.fragmentText,
    primaryCategory: fragment.primaryCategory,
    subcategories: overrides.subcategories ?? [],
    activityLabel: overrides.activityLabel ?? fragment.fragmentText,
    timeCheckpointId: fragment.timeCheckpointId,
    eventTime: fragment.eventTime,
    details: overrides.details ?? {},
    score,
    scoreMeaning: overrides.scoreMeaning ?? scoreMeaningFromScore(score),
    co2EstimateKg: overrides.co2EstimateKg ?? null,
    missingFields: overrides.missingFields ?? [],
    confidence: overrides.confidence ?? fragment.confidence,
  };
}
