import {
  buildCategoryDetailSchemaForPrompt,
  getDetailFieldsForCategory,
  MAX_PANDA_FOLLOW_UPS,
  type DetailFieldSpec,
} from "@/ai/categoryDetailSchema";
import { parseActivityText } from "@/logic/parserFallback";
import { normalizePrimaryCategory } from "@/logic/categoryScoring";
import {
  inferFlightRouteFromContext,
  isCommuteDistanceForFlight,
  isFlightTransport,
  parseKnownCityFromText,
} from "@/logic/travelInference";
import { inferActivityWithPandaProcessor } from "@/ai/pandaCategoryProcessors";
import type { PrimaryActionCategory, UserProfile } from "@/types";
import type { PandaExtractedActivity, PandaParseResult } from "./pandaSchemas";

export { buildCategoryDetailSchemaForPrompt, MAX_PANDA_FOLLOW_UPS };

export function buildConversationText(parse: PandaParseResult): string {
  const replies = parse.conversationReplies ?? [];
  return [parse.originalText, ...replies].filter((part) => part.trim().length > 0).join("\n");
}

function looksLikeWorkFromHomeText(text: string): boolean {
  return /\b(work from home|worked from home|wfh|working from home|did not travel to office|didn't travel to office|no commute|not travel to office)\b/i.test(
    text,
  );
}

function fieldApplies(spec: DetailFieldSpec, details: Record<string, unknown>): boolean {
  if (!spec.appliesWhen) return true;
  const value = String(details[spec.appliesWhen.field] ?? "");
  const expected = spec.appliesWhen.equals;
  return Array.isArray(expected) ? expected.includes(value) : value === expected;
}

function hasPositiveNumber(value: unknown): boolean {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) && num > 0;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isCommuteLikeTransport(
  activity: PandaExtractedActivity,
  details: Record<string, unknown>,
  originalText: string,
): boolean {
  const text = `${originalText} ${activity.activityType} ${activity.label} ${Object.values(details).join(" ")}`;
  return (
    /\bcommute|office|work\b/i.test(text) ||
    details.purpose === "work" ||
    details.tripPurpose === "work" ||
    details.destination === "office"
  );
}

function resolvePrimaryCategory(activity: PandaExtractedActivity) {
  const details = activity.details ?? {};
  if (isFlightTransport(details, activity.label, activity.activityType)) {
    return "travel_trips" as const;
  }
  return (
    activity.primaryCategory ??
    normalizePrimaryCategory(activity.rawPrimaryCategory, activity.category).primaryCategory
  );
}

export function looksLikeSocialEventText(text: string): boolean {
  return /\b(birthday party|birthday|party|wedding|festival|celebration|gathering|get together|get-together)\b/i.test(
    text,
  );
}

function buildSocialEventLabel(text: string): string {
  if (/\bbirthday party\b/i.test(text)) return "Birthday party";
  if (/\bbirthday\b/i.test(text)) return "Birthday celebration";
  if (/\bwedding\b/i.test(text)) return "Wedding celebration";
  if (/\bfestival\b/i.test(text)) return "Festival gathering";
  if (/\bparty\b/i.test(text)) return "Party";
  return "Social gathering";
}

function inferVenueFromText(text: string): "home" | "elsewhere" | undefined {
  if (/\b(at home|at my home|in my home|home party|held at home|it was at home)\b/i.test(text)) {
    return "home";
  }
  if (/\b(restaurant|hotel|banquet|venue|hall|elsewhere|outside)\b/i.test(text)) {
    return "elsewhere";
  }
  return undefined;
}

function inferGuestTravelFromText(text: string): "none" | "some" | "unknown" | undefined {
  if (/\b(no travel|no transport|didn't travel|did not travel|none|no guests traveled|no one traveled)\b/i.test(text)) {
    return "none";
  }
  if (/\b(at home|it was at home)\b/i.test(text) && /\bno\b/i.test(text)) {
    return "none";
  }
  if (/\b(some guests|many guests|most guests|guests traveled|guests came)\b/i.test(text)) {
    return "some";
  }
  return undefined;
}

function inferGuestCountFromText(text: string): number | undefined {
  const guestMatch = text.match(/\b(\d+)\s+guests?\b/i);
  if (guestMatch) return Number(guestMatch[1]);
  const peopleMatch = text.match(/\b(\d+)\s+people\b/i);
  if (peopleMatch) return Number(peopleMatch[1]);
  return undefined;
}

export function normalizeSocialLeisureActivity(
  activity: PandaExtractedActivity,
  originalText: string,
): PandaExtractedActivity {
  if (!looksLikeSocialEventText(originalText)) return activity;

  const venue = inferVenueFromText(originalText);
  const guestTravel = inferGuestTravelFromText(originalText);
  const guestCount = inferGuestCountFromText(originalText);

  return {
    ...activity,
    category: "special",
    primaryCategory: "social_leisure",
    activityType: activity.activityType === "flight" ? "party" : activity.activityType || "party",
    label: looksLikeSocialEventText(activity.label) ? activity.label : buildSocialEventLabel(originalText),
    details: {
      subcategory: "party",
      specialType: "party",
      ...activity.details,
      ...(venue ? { venue } : {}),
      ...(guestTravel ? { guestTravel } : {}),
      ...(guestCount ? { guestCount } : {}),
    },
  };
}

function enrichActivityDetails(
  activity: PandaExtractedActivity,
  profile: UserProfile,
  originalText: string,
): Record<string, unknown> {
  const normalizedActivity = normalizeSocialLeisureActivity(activity, originalText);
  const details = { ...normalizedActivity.details };
  const primaryCategory = resolvePrimaryCategory(normalizedActivity);

  if (primaryCategory === "social_leisure") {
    const guestCount = inferGuestCountFromText(originalText);
    if (guestCount && !hasPositiveNumber(details.guestCount)) {
      details.guestCount = guestCount;
    }
    const venue = inferVenueFromText(originalText);
    if (venue && !hasNonEmptyString(details.venue)) {
      details.venue = venue;
    }
    const guestTravel = inferGuestTravelFromText(originalText);
    if (guestTravel && !hasNonEmptyString(details.guestTravel)) {
      details.guestTravel = guestTravel;
    }
    if (!hasNonEmptyString(details.mealSource)) {
      if (details.venue === "home" || inferVenueFromText(originalText) === "home") {
        details.mealSource = "home_cooked";
      } else if (details.venue === "elsewhere") {
        details.mealSource = "restaurant";
      }
    }
  }

  if (primaryCategory === "work_study" || looksLikeWorkFromHomeText(originalText)) {
    if (!hasNonEmptyString(details.workMode) && looksLikeWorkFromHomeText(originalText)) {
      details.workMode = "work_from_home";
      if (!hasNonEmptyString(details.subcategory)) {
        details.subcategory = "work_from_home";
      }
    }
  }

  if (primaryCategory === "digital_devices" || /\b(laptop|phone|streaming|gaming|video call|tv|television|netflix|watched)\b/i.test(originalText)) {
    if (!hasNonEmptyString(details.subcategory)) {
      if (/\b(tv|television|netflix|hotstar|watched tv|watching tv)\b/i.test(originalText)) {
        details.subcategory = "tv_router";
      } else if (/\blaptop\b/i.test(originalText)) details.subcategory = "laptop_use";
      else if (/\bphone\b/i.test(originalText)) details.subcategory = "phone_use";
      else if (/\bstream/i.test(originalText)) details.subcategory = "streaming";
      else if (/\bgam/i.test(originalText)) details.subcategory = "gaming";
      else if (/\bvideo call/i.test(originalText)) details.subcategory = "video_calls";
    }
    const hourMatch = originalText.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/i);
    if (hourMatch && !hasPositiveNumber(details.durationHours)) {
      details.durationHours = Number(hourMatch[1]);
    }
    if (
      !hasPositiveNumber(details.durationHours) &&
      looksLikeWorkFromHomeText(originalText) &&
      details.subcategory === "laptop_use"
    ) {
      details.durationHours = 6;
    }
  }

  if (isFlightTransport(details, normalizedActivity.label, normalizedActivity.activityType)) {
    Object.assign(
      details,
      inferFlightRouteFromContext(details, originalText, activity.label, activity.activityType),
    );
  }

  if (
    normalizedActivity.category === "transport" &&
    !looksLikeSocialEventText(originalText) &&
    !isFlightTransport(details, normalizedActivity.label, normalizedActivity.activityType) &&
    isCommuteLikeTransport(normalizedActivity, details, originalText) &&
    !hasPositiveNumber(details.distanceKm) &&
    typeof profile.core.usualCommuteDistanceKm === "number"
  ) {
    details.distanceKm = profile.core.usualCommuteDistanceKm;
  }

  return details;
}

function isFieldPresent(spec: DetailFieldSpec, details: Record<string, unknown>): boolean {
  if (!fieldApplies(spec, details)) return true;

  if (spec.key === "distanceKm") {
    if (details.mode === "flight") {
      const distance = Number(details.distanceKm ?? 0);
      return hasPositiveNumber(distance) && !isCommuteDistanceForFlight(distance);
    }
    return hasPositiveNumber(details.distanceKm);
  }

  if (spec.type === "number") {
    if (spec.key === "durationHours") {
      return (
        hasPositiveNumber(details.durationHours) ||
        hasPositiveNumber(details.extraAcHours) ||
        hasPositiveNumber(details.acHours)
      );
    }
    return hasPositiveNumber(details[spec.key]);
  }

  if (spec.type === "city" || spec.type === "string") {
    return hasNonEmptyString(details[spec.key]);
  }

  if (spec.type === "enum") {
    return hasNonEmptyString(details[spec.key]);
  }

  return details[spec.key] !== undefined && details[spec.key] !== null;
}

export function getMissingDetailFields(
  activity: PandaExtractedActivity,
  profile: UserProfile,
  originalText: string,
): DetailFieldSpec[] {
  const normalizedActivity = normalizeSocialLeisureActivity(activity, originalText);
  const primaryCategory = resolvePrimaryCategory(normalizedActivity);
  const details = enrichActivityDetails(activity, profile, originalText);
  const fields = getDetailFieldsForCategory(primaryCategory).filter((spec) => spec.requiredForEstimate);

  return fields
    .filter((spec) => fieldApplies(spec, details) && !isFieldPresent(spec, details))
    .sort((a, b) => a.priority - b.priority);
}

export function getTargetActivityIndex(activities: PandaExtractedActivity[]): number {
  const dominant = activities.findIndex((item) => item.dominantImpact);
  if (dominant >= 0) return dominant;
  return activities.length > 0 ? 0 : -1;
}

export function buildFollowUpForParse(
  parse: PandaParseResult,
  profile: UserProfile,
  activityIndex = getTargetActivityIndex(parse.extractedActivities),
): Pick<PandaParseResult, "missingFields" | "followUpQuestion" | "quickReplies" | "assistantMessage"> | null {
  if (activityIndex < 0 || parse.extractedActivities.length === 0) return null;

  const activity = parse.extractedActivities[activityIndex];
  const missing = getMissingDetailFields(activity, profile, buildConversationText(parse));
  if (missing.length === 0) return null;

  const nextField = missing[0];
  const label = activity.label || "this activity";

  return {
    missingFields: [nextField.key],
    followUpQuestion: nextField.followUpQuestion,
    quickReplies: nextField.quickReplies ?? [],
    assistantMessage:
      parse.assistantMessage ||
      `Got it — I have ${label}. ${nextField.followUpQuestion}`,
  };
}

function normalizeChipKey(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isSafeChipForMissingFields(chip: string, missingFields: string[], primaryCategory: PrimaryActionCategory): boolean {
  const normalized = chip.toLowerCase();
  if (missingFields.some((field) => /mode|transport|travel/i.test(field))) {
    return /\b(walk|cycled?|cycle|bus|drove|drive|car|auto|cab|metro|train|scooter)\b/i.test(chip);
  }
  if (missingFields.some((field) => /distance/i.test(field))) {
    return /\b(same|usual|\d+(?:\.\d+)?\s*(?:km|h|hr|hour))\b/i.test(chip);
  }
  if (missingFields.some((field) => /duration|hour/i.test(field))) {
    return /\b\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours)\b/i.test(chip);
  }
  if (primaryCategory === "food_meals") {
    return /\b(home|canteen|restaurant|ordered|online|veg|egg|chicken|fish|meat|snack|tea|coffee)\b/i.test(chip);
  }
  if (primaryCategory === "digital_devices") {
    return /\b(laptop|phone|tv|stream|gaming|video|router|desktop)\b/i.test(chip);
  }
  return normalized.length > 0 && normalized.length <= 40;
}

function sanitizedQuickReplies(
  activity: PandaExtractedActivity,
  missingFields: string[],
  schemaReplies: string[],
  aiReplies: string[],
): string[] {
  const primaryCategory = resolvePrimaryCategory(activity);
  const merged = [...schemaReplies];
  for (const chip of aiReplies) {
    if (merged.length >= 6) break;
    if (isSafeChipForMissingFields(chip, missingFields, primaryCategory)) merged.push(chip);
  }

  const seen = new Set<string>();
  return merged
    .map((chip) => chip.trim())
    .filter(Boolean)
    .filter((chip) => {
      const key = normalizeChipKey(chip);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

export function inferPendingActivityFromText(
  parse: PandaParseResult,
  profile: UserProfile,
): PandaExtractedActivity | null {
  const text = buildConversationText(parse).trim();
  if (!text) return null;

  const legacy = parseActivityText(text, profile);
  const legacyActivity = legacy.activities[0];
  if (legacyActivity) {
    const mapping = normalizePrimaryCategory(undefined, legacyActivity.category);
    const travel = inferFlightRouteFromContext(legacyActivity.details ?? {}, text);
    const isFlight = isFlightTransport(travel, legacyActivity.label, legacyActivity.activityType);
    return {
      category: legacyActivity.category ?? "special",
      primaryCategory: isFlight ? "travel_trips" : mapping.primaryCategory,
      activityType: legacyActivity.activityType ?? "manual_update",
      label: legacyActivity.label ?? "Activity update",
      timeSlot: parse.detectedSlotId ?? "morning_commute",
      details: { ...(legacyActivity.details ?? {}), ...travel },
      confidence: 0.85,
      status: "confirmed",
      dominantImpact: isFlight,
    };
  }

  if (looksLikeWorkFromHomeText(text)) {
    const usesLaptop = /\b(laptop|computer|macbook)\b/i.test(text);
    return {
      category: usesLaptop ? "digital" : "energy",
      primaryCategory: usesLaptop ? "digital_devices" : "work_study",
      activityType: usesLaptop ? "laptop_use" : "work_from_home",
      label: usesLaptop ? "Laptop use while working from home" : "Worked from home",
      timeSlot: parse.detectedSlotId ?? "work_study",
      details: {
        workMode: "work_from_home",
        subcategory: usesLaptop ? "laptop_use" : "work_from_home",
        ...(usesLaptop ? { durationHours: 6 } : {}),
      },
      confidence: 0.85,
      status: "confirmed",
      dominantImpact: !usesLaptop,
    };
  }

  if (looksLikeSocialEventText(text)) {
    const venue = inferVenueFromText(text);
    const guestTravel = inferGuestTravelFromText(text);
    const guestCount = inferGuestCountFromText(text);
    return {
      category: "special",
      primaryCategory: "social_leisure",
      activityType: "party",
      label: buildSocialEventLabel(text),
      timeSlot: parse.detectedSlotId ?? "afternoon_activity",
      details: {
        subcategory: "party",
        specialType: "party",
        ...(venue ? { venue } : {}),
        ...(guestTravel ? { guestTravel } : {}),
        ...(guestCount ? { guestCount } : {}),
      },
      confidence: 0.85,
      status: "confirmed",
      dominantImpact: true,
    };
  }

  const travel = inferFlightRouteFromContext(text);
  if (travel.mode === "flight" || /\b(flight|flew|flying)\b/i.test(text)) {
    return {
      category: "transport",
      primaryCategory: "travel_trips",
      activityType: "flight",
      label: travel.destination ? `Flight to ${travel.destination}` : "Flight",
      timeSlot: parse.detectedSlotId ?? "morning_commute",
      details: travel,
      confidence: 0.85,
      status: "confirmed",
      dominantImpact: true,
    };
  }

  const processorActivity = inferActivityWithPandaProcessor({ text, parse, profile });
  return processorActivity.primaryCategory === "other_unknown" ? null : processorActivity;
}

export function ensurePendingActivities(parse: PandaParseResult, profile: UserProfile): PandaParseResult {
  if (parse.extractedActivities.length > 0) return parse;
  if (!parse.followUpQuestion && parse.missingFields.length === 0) return parse;

  const stub = inferPendingActivityFromText(parse, profile);
  if (!stub) return parse;

  return {
    ...parse,
    extractedActivities: [stub],
    pendingActivityIndex: 0,
  };
}

export function applyCompletenessToParse(parse: PandaParseResult, profile: UserProfile): PandaParseResult {
  const withActivities = ensurePendingActivities(parse, profile);
  const enrichedActivities = withActivities.extractedActivities.map((activity) => ({
    ...activity,
    details: enrichActivityDetails(activity, profile, buildConversationText(withActivities)),
  }));

  const base: PandaParseResult = {
    ...withActivities,
    extractedActivities: enrichedActivities,
    followUpRound: parse.followUpRound ?? 0,
    maxFollowUps: parse.maxFollowUps ?? MAX_PANDA_FOLLOW_UPS,
    pendingActivityIndex: parse.pendingActivityIndex ?? getTargetActivityIndex(enrichedActivities),
  };

  if (base.extractedActivities.length === 0) return base;

  const followUp = buildFollowUpForParse(base, profile, base.pendingActivityIndex ?? 0);
  if (!followUp) {
    return {
      ...base,
      missingFields: [],
      followUpQuestion: null,
      quickReplies: [],
    };
  }

  const round = base.followUpRound ?? 0;
  const max = base.maxFollowUps ?? MAX_PANDA_FOLLOW_UPS;
  if (round >= max) {
    return {
      ...base,
      missingFields: [],
      followUpQuestion: null,
      quickReplies: [],
    };
  }

  const aiAlreadyAsking =
    base.followUpQuestion &&
    base.missingFields.some((field) => followUp.missingFields.includes(field));

  return {
    ...base,
    missingFields: aiAlreadyAsking ? base.missingFields : followUp.missingFields,
    followUpQuestion: aiAlreadyAsking ? base.followUpQuestion : followUp.followUpQuestion,
    quickReplies: sanitizedQuickReplies(
      base.extractedActivities[base.pendingActivityIndex ?? 0],
      aiAlreadyAsking ? base.missingFields : followUp.missingFields,
      followUp.quickReplies,
      aiAlreadyAsking ? base.quickReplies : [],
    ),
    assistantMessage: aiAlreadyAsking ? base.assistantMessage : followUp.assistantMessage,
  };
}

export function shouldContinueFollowUp(parse: PandaParseResult): boolean {
  if (!parse.followUpQuestion || parse.extractedActivities.length === 0) return false;
  const round = parse.followUpRound ?? 0;
  const max = parse.maxFollowUps ?? MAX_PANDA_FOLLOW_UPS;
  return round < max;
}

export function nextPendingParseAfterReply(
  parse: PandaParseResult,
  profile: UserProfile,
): PandaParseResult {
  const nextRound = (parse.followUpRound ?? 0) + 1;
  const enriched = applyCompletenessToParse(
    {
      ...parse,
      followUpRound: nextRound,
      missingFields: [],
      followUpQuestion: null,
      quickReplies: [],
    },
    profile,
  );

  if (enriched.followUpQuestion && nextRound < (enriched.maxFollowUps ?? MAX_PANDA_FOLLOW_UPS)) {
    return enriched;
  }

  return {
    ...enriched,
    missingFields: [],
    followUpQuestion: null,
    quickReplies: [],
  };
}

export function mergeAiFollowUpParse(
  pending: PandaParseResult,
  aiParse: PandaParseResult,
  latestReply: string,
): PandaParseResult {
  const conversationReplies = [...(pending.conversationReplies ?? []), latestReply.trim()];
  const followUpRound = (pending.followUpRound ?? 0) + 1;

  if (aiParse.extractedActivities.length === 0) {
    return {
      ...pending,
      conversationReplies,
      followUpRound,
    };
  }

  return {
    ...aiParse,
    originalText: pending.originalText,
    conversationReplies,
    followUpRound,
  };
}

function normalizeEnumReply(reply: string, options: string[]): string | undefined {
  const normalized = reply.toLowerCase().replace(/[\s-]+/g, "_");
  const direct = options.find((option) => normalized === option || normalized.includes(option));
  if (direct) return direct;

  const aliases: Record<string, string> = {
    flight: "flight",
    train: "train",
    bus: "bus",
    domestic: "domestic",
    international: "international",
    home_cooked: "home_cooked",
    ordered_online: "ordered_online",
    vegetarian: "vegetarian_low_dairy",
    veg: "vegetarian_low_dairy",
    chicken: "chicken_fish",
    fish: "chicken_fish",
    at_home: "home",
    home: "home",
    elsewhere: "elsewhere",
    no_travel: "none",
    none: "none",
    not_sure: "unknown",
    laptop: "laptop_use",
    phone: "phone_use",
    streaming: "streaming",
    gaming: "gaming",
    video_calls: "video_calls",
    work_from_home: "work_from_home",
    office_day: "office_day",
    hybrid_day: "hybrid_day",
  };

  for (const [token, value] of Object.entries(aliases)) {
    if (normalized.includes(token) && options.includes(value)) return value;
  }

  return undefined;
}

export function parseSchemaFollowUpReply(
  reply: string,
  activity: PandaExtractedActivity,
  missingFields: string[],
): Record<string, unknown> {
  const primaryCategory = resolvePrimaryCategory(activity);
  const fields = getDetailFieldsForCategory(primaryCategory as PrimaryActionCategory);
  const details: Record<string, unknown> = {};
  const normalized = reply.toLowerCase();

  for (const fieldKey of missingFields) {
    const spec = fields.find((field) => field.key === fieldKey);
    if (!spec) continue;

    if (spec.type === "city") {
      const city = parseKnownCityFromText(reply.trim());
      if (city) details[spec.key] = city.label;
      continue;
    }

    if (spec.type === "enum" && spec.options) {
      const match = normalizeEnumReply(reply, spec.options);
      if (match) {
        details[spec.key] = match;
        continue;
      }
      if (spec.key === "venue" && normalized.includes("home")) {
        details.venue = "home";
      } else if (spec.key === "venue" && normalized.includes("elsewhere")) {
        details.venue = "elsewhere";
      } else if (spec.key === "guestTravel" && (normalized.includes("no") || normalized.includes("none"))) {
        details.guestTravel = "none";
      } else if (spec.key === "guestTravel" && normalized.includes("some")) {
        details.guestTravel = "some";
      } else if (spec.key === "subcategory" && normalized.includes("laptop")) {
        details.subcategory = "laptop_use";
      } else if (spec.key === "subcategory" && normalized.includes("phone")) {
        details.subcategory = "phone_use";
      } else if (spec.key === "workMode" && normalized.includes("home")) {
        details.workMode = "work_from_home";
      }
      continue;
    }

    if (spec.type === "number") {
      if (normalized.includes("route distance") || normalized.includes("use route")) {
        const route = inferFlightRouteFromContext(activity.details, activity.label, activity.activityType);
        if (typeof route.distanceKm === "number") {
          details.distanceKm = route.distanceKm;
        }
        continue;
      }
      const match = reply.match(/\d+(?:\.\d+)?/);
      if (match) details[spec.key] = Number(match[0]);
    }
  }

  return details;
}
