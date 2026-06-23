import { buildActivityEntry, finalizeActivityDay } from "@/logic/activityBuilder";
import { inferTravelDetailsFromText, inferFlightRouteFromContext, isFlightTransport, parseKnownCityFromText } from "@/logic/travelInference";
import type { ActivityDay, ActivityEntry, UserProfile } from "@/types";
import type { PandaParseResult } from "./pandaSchemas";
import { getActivityCheckpointSlot, getCheckpointStatuses } from "./checkpointEngine";
import {
  getDefaultCommutePrediction,
  inferStatusFromProbability,
  recordBehaviorConfirmation,
  type BehaviorPattern,
} from "./behaviorProbability";
import { applyQuickReplyToParse } from "./checkpointEngine";
import type { CheckpointSlotId } from "./pandaSchemas";
import { timeToCheckpointId } from "./pandaFragmentParser";
import {
  buildConversationText,
  ensurePendingActivities,
  looksLikeSocialEventText,
  nextPendingParseAfterReply,
  normalizeSocialLeisureActivity,
  parseSchemaFollowUpReply,
} from "./pandaCompleteness";
import { parseFollowUpWithPandaProcessor } from "./pandaCategoryProcessors";

export type PandaFollowUpResult = {
  day?: ActivityDay;
  patterns: BehaviorPattern[];
  pendingParse?: PandaParseResult | null;
  assistantMessage: string;
  saved: boolean;
};

function emptyDay(profile: UserProfile, todayDate: string): ActivityDay {
  const dayId = `${profile.id}-${todayDate}`;
  return {
    id: dayId,
    profileId: profile.id,
    date: todayDate,
    dayType: "unknown",
    status: "mixed",
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

function dayOfWeekForDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function mergeActivitiesBySlots(
  existing: ActivityEntry[],
  incoming: ActivityEntry[],
  slotIds: CheckpointSlotId[],
): ActivityEntry[] {
  const replaceSlots = new Set(slotIds.filter(Boolean));
  for (const activity of incoming) {
    const slot = getActivityCheckpointSlot(activity);
    if (slot) replaceSlots.add(slot);
  }
  const kept = existing.filter((activity) => {
    const slot = getActivityCheckpointSlot(activity);
    if (slot && replaceSlots.has(slot)) return false;
    return true;
  });
  return [...kept, ...incoming];
}

function recordPatternsFromParse(
  patterns: BehaviorPattern[],
  parse: PandaParseResult,
  todayDate: string,
): BehaviorPattern[] {
  const dayOfWeek = dayOfWeekForDate(todayDate);
  let next = patterns;

  for (const item of parse.extractedActivities) {
    if (item.category !== "transport" || !item.details.mode) continue;
    if (item.status && item.status !== "confirmed" && item.status !== "assumed") continue;

    next = recordBehaviorConfirmation(
      next,
      item.timeSlot === "evening_commute" ? "evening_commute" : "morning_commute",
      dayOfWeek,
      "transport",
      "mode",
      String(item.details.mode),
    );
  }

  return next;
}

function normalizePandaActivityDetails(details: Record<string, unknown>): Record<string, unknown> {
  const next = { ...details };

  if (typeof next.mealSource === "string") {
    const source = next.mealSource.toLowerCase().replace(/[\s-]+/g, "_");
    if (source === "homemade" || source === "home_made" || source === "home_cooked" || source === "home_food") {
      next.mealSource = "home_cooked";
    } else if (source === "ordered" || source === "delivery" || source === "ordered_online") {
      next.mealSource = "ordered_online";
    }
  }

  if (typeof next.foodType === "string") {
    const type = next.foodType.toLowerCase().replace(/[\s-]+/g, "_");
    if (type === "vegetarian" || type === "veg" || type === "plant_based") {
      next.foodType = "vegetarian_low_dairy";
    } else if (type === "dairy" || type === "veg_dairy") {
      next.foodType = "veg_dairy";
    }
  }

  return next;
}

function enrichTravelDetailsFromActivity(item: PandaParseResult["extractedActivities"][number]): Record<string, unknown> {
  const text = `${item.activityType} ${item.label} ${item.rawPrimaryCategory ?? ""} ${Object.values(item.details).join(" ")}`;
  const inferred = inferTravelDetailsFromText(text);
  const details = { ...inferred, ...item.details };
  const combined = text.toLowerCase();

  if (!details.mode && /\b(flight|plane|airplane|airport|aviation)\b/.test(combined)) {
    details.mode = "flight";
  }

  if (isFlightTransport(details, item.label, item.activityType)) {
    const route = inferFlightRouteFromContext(details, item.label, item.activityType);
    Object.assign(details, route);
  }

  if (details.mode === "flight" && !details.baselineDistanceKm && typeof details.distanceKm === "number") {
    details.baselineDistanceKm = details.distanceKm;
  }

  return details;
}

export function pandaActivitiesFromParse(parse: PandaParseResult): Partial<ActivityEntry>[] {
  return parse.extractedActivities.map((item, index) => {
    const enrichedDetails = normalizePandaActivityDetails(enrichTravelDetailsFromActivity(item));
    const eventTime =
      typeof enrichedDetails.eventTime === "string"
        ? enrichedDetails.eventTime
        : typeof parse.detectedTime === "string"
          ? parse.detectedTime
          : undefined;
    const checkpointId =
      typeof enrichedDetails.timeCheckpointId === "string"
        ? enrichedDetails.timeCheckpointId
        : typeof enrichedDetails.checkpointId === "string"
          ? enrichedDetails.checkpointId
          : eventTime
            ? timeToCheckpointId(eventTime) ?? undefined
            : undefined;

    return {
      checkpointId,
      eventTime,
      category: item.category,
      primaryCategory: item.primaryCategory,
      rawPrimaryCategory: item.rawPrimaryCategory,
      subcategory: item.subcategory,
      categoryScore: item.categoryScore,
      greenScore: item.greenScore,
      scoreMeaning: item.scoreMeaning,
      dominantImpact: item.dominantImpact || parse.bundle?.dominantEventIndex === index,
      parentBundleId: item.parentBundleId,
      includedInParentContext: item.includedInParentContext,
      activityType: item.activityType,
      label: item.label,
      status: item.status ?? "confirmed",
      source: "free_text",
      details: {
        ...enrichedDetails,
        ...(item.category === "special" &&
        `${item.activityType} ${item.label}`.toLowerCase().includes("car wash")
          ? { specialType: "car_wash" }
          : {}),
        rawAiCategory: item.rawPrimaryCategory,
        categoryScore: item.categoryScore,
        scoreMeaning: item.scoreMeaning,
        greenScore: item.greenScore,
        dominantImpact: item.dominantImpact || parse.bundle?.dominantEventIndex === index,
        parentBundleId: item.parentBundleId,
        includedInParentContext: item.includedInParentContext,
        timeSlot: item.timeSlot,
        ...(eventTime ? { eventTime, loggedTime: eventTime } : { loggedTime: parse.detectedTime }),
        ...(checkpointId ? { checkpointId, timeCheckpointId: checkpointId } : {}),
      },
      explanation:
        item.status === "assumed" || item.status === "estimated_from_profile"
          ? "Panda filled this from your usual routine. Tap to correct."
          : undefined,
    };
  });
}

/** Pre-fill missing slots from learned patterns or Carbon Memory (probability-based). */
export function applyProbabilisticDefaults(
  day: ActivityDay | undefined,
  profile: UserProfile,
  todayDate: string,
  patterns: BehaviorPattern[],
): ActivityDay | null {
  const statuses = getCheckpointStatuses(day);
  if (statuses.morning_commute !== "missing") return null;

  const dayOfWeek = dayOfWeekForDate(todayDate);
  const learned = patterns
    .filter((pattern) => pattern.slotId === "morning_commute" && pattern.dayOfWeek === dayOfWeek)
    .sort((a, b) => b.probability - a.probability)[0];

  let partial: Partial<ActivityEntry> | null = null;

  if (learned && learned.probability >= 0.6) {
    partial = {
      category: "transport",
      activityType: "commute_outbound",
      label: "Morning Commute",
      status: inferStatusFromProbability(learned.probability),
      source: "autofill",
      details: {
        mode: learned.fieldValue,
        predictedFromPattern: true,
        probability: learned.probability,
      },
    };
  } else {
    const prediction = getDefaultCommutePrediction(profile, dayOfWeek);
    if (!prediction) return null;
    partial = {
      category: "transport",
      activityType: "commute_outbound",
      label: "Morning Commute",
      status: prediction.status,
      source: "autofill",
      details: prediction.details,
    };
  }

  if (!partial) return null;

  const base = day ?? emptyDay(profile, todayDate);
  const dayId = base.id;
  const entry = buildActivityEntry(partial, dayId, profile);

  return finalizeActivityDay(
    {
      ...base,
      status: "mixed",
      activities: mergeActivitiesBySlots(base.activities, [entry], ["morning_commute"]),
      updatedAt: new Date().toISOString(),
    },
    profile,
  );
}

export function applyPandaParseToDay(
  day: ActivityDay | undefined,
  profile: UserProfile,
  todayDate: string,
  parse: PandaParseResult,
  patterns: BehaviorPattern[] = [],
): { day: ActivityDay; patterns: BehaviorPattern[] } {
  const dayId = day?.id ?? `${profile.id}-${todayDate}`;
  const slotIds = parse.extractedActivities.map((item) => item.timeSlot);
  const newActivities = pandaActivitiesFromParse(parse).map((partial) =>
    buildActivityEntry(partial, dayId, profile),
  );

  const merged: ActivityDay = {
    id: dayId,
    profileId: profile.id,
    date: todayDate,
    dayType: day?.dayType ?? "unknown",
    status: "mixed",
    activities: mergeActivitiesBySlots(day?.activities ?? [], newActivities, slotIds),
    totals: day?.totals ?? emptyDay(profile, todayDate).totals,
    visualSummary: day?.visualSummary ?? emptyDay(profile, todayDate).visualSummary,
    createdAt: day?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    day: finalizeActivityDay(merged, profile),
    patterns: recordPatternsFromParse(patterns, parse, todayDate),
  };
}

function parseDistanceFromReply(reply: string): number | undefined {
  const match = reply.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  return match ? Number(match[1]) : undefined;
}

function parseHoursFromReply(reply: string): number | undefined {
  const match = reply.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  return match ? Number(match[1]) : undefined;
}

function estimatedDistanceFromDurationHours(mode: string | undefined, hours: number): number | undefined {
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  const normalizedMode = String(mode ?? "").toLowerCase();
  const averageSpeedKmh =
    normalizedMode === "walk"
      ? 4
      : normalizedMode === "cycle"
        ? 12
        : normalizedMode === "bus"
          ? 18
          : normalizedMode === "metro" || normalizedMode === "train"
            ? 28
            : normalizedMode === "auto" || normalizedMode === "scooter"
              ? 22
              : normalizedMode === "car" || normalizedMode === "cab" || normalizedMode === "carpool"
                ? 25
                : undefined;
  return averageSpeedKmh ? Math.round(hours * averageSpeedKmh * 10) / 10 : undefined;
}

function parseCountFromReply(reply: string): number | undefined {
  const match = reply.match(/\b(\d+)\b/);
  return match ? Number(match[1]) : undefined;
}

function fieldMatches(fields: string[], tokens: string[]): boolean {
  return fields.some((field) => {
    const normalized = field.toLowerCase().replace(/[_\s-]+/g, "");
    return tokens.some((token) => {
      const needle = token.toLowerCase().replace(/[_\s-]+/g, "");
      return normalized.includes(needle) || needle.includes(normalized);
    });
  });
}

function booleanReply(normalized: string): boolean | "unknown" | undefined {
  if (normalized.includes("not sure") || normalized.includes("unknown") || normalized.includes("don't know")) return "unknown";
  if (/\b(no|without|skip|none|not using|didn't|did not)\b/.test(normalized)) return false;
  if (/\b(yes|with|used|use|add|include)\b/.test(normalized)) return true;
  return undefined;
}

function genericDetailsFromFollowUpReply(
  reply: string,
  missingFields: string[],
  followUpQuestion: string | null,
): Record<string, unknown> {
  const normalized = reply.toLowerCase();
  const details: Record<string, unknown> = {
    followUp: {
      question: followUpQuestion,
      reply,
      missingFields,
    },
  };
  const bool = booleanReply(normalized);
  const distanceKm = parseDistanceFromReply(reply);
  const hours = parseHoursFromReply(reply);
  const count = parseCountFromReply(reply);

  if (typeof distanceKm === "number" && fieldMatches(missingFields, ["distance", "distanceKm"])) {
    details.distanceKm = distanceKm;
  }

  if (typeof hours === "number") {
    if (fieldMatches(missingFields, ["extraAcHours", "acHours", "hours", "duration"])) {
      details.extraAcHours = hours;
    }
    details.durationHours = hours;
  }

  if (typeof count === "number" && fieldMatches(missingFields, ["count", "quantity", "items", "parcels"])) {
    details.count = count;
  }

  if (fieldMatches(missingFields, ["packaging"])) {
    if (normalized.includes("plastic")) details.packaging = "plastic_heavy";
    else if (normalized.includes("minimal") || normalized.includes("less")) details.packaging = "minimal";
    else if (normalized.includes("none") || normalized.includes("no packaging")) details.packaging = "none";
    else if (normalized.includes("normal")) details.packaging = "normal";
  }

  if (fieldMatches(missingFields, ["planned", "tripType", "oneTime", "profileUpdate"])) {
    if (normalized.includes("planned") || normalized.includes("one-time") || normalized.includes("one time")) {
      details.tripType = "planned_one_time";
    } else if (normalized.includes("sudden") || normalized.includes("unplanned")) {
      details.tripType = "sudden_change";
    } else if (normalized.includes("usual") || normalized.includes("profile") || normalized.includes("future")) {
      details.tripType = "recurring";
    }
  }

  if (bool !== undefined) {
    for (const field of missingFields) {
      const key = field.trim();
      if (!key || key in details) continue;
      if (/^[a-zA-Z_$][\w$]*$/.test(key)) details[key] = bool;
    }
  }

  if (fieldMatches(missingFields, ["venue", "location", "place", "where"])) {
    if (normalized.includes("home")) details.venue = "home";
    if (normalized.includes("elsewhere")) details.venue = "elsewhere";
  }

  if (fieldMatches(missingFields, ["guestTravel", "transport", "travel", "mode"])) {
    if (normalized.includes("no") || normalized.includes("none") || normalized.includes("no travel")) {
      details.guestTravel = "none";
      if (!details.venue) details.venue = "home";
    } else if (normalized.includes("some")) {
      details.guestTravel = "some";
    }
  }

  return details;
}

function socialLeisureDetailsFromFollowUpReply(
  reply: string,
  activity: PandaParseResult["extractedActivities"][number],
  missingFields: string[],
  followUpQuestion: string | null,
  originalText: string,
): Record<string, unknown> {
  const normalized = reply.toLowerCase();
  const context = `${activity.label} ${originalText} ${followUpQuestion ?? ""}`;
  if (activity.primaryCategory !== "social_leisure" && !looksLikeSocialEventText(context)) {
    return {};
  }

  const details: Record<string, unknown> = {};

  if (normalized.includes("at home") || (normalized.includes("home") && !normalized.includes("homework"))) {
    details.venue = "home";
    if (
      followUpQuestion &&
      /home.?cook|restaurant|meal|food|cater/i.test(followUpQuestion)
    ) {
      details.mealSource = "home_cooked";
    }
  } else if (normalized.includes("elsewhere")) {
    details.venue = "elsewhere";
  } else if (
    normalized.includes("restaurant") ||
    normalized.includes("ordered") ||
    normalized.includes("cater")
  ) {
    details.mealSource = "restaurant";
  } else if (
    normalized.includes("home cooked") ||
    normalized.includes("home-cooked") ||
    normalized.includes("homemade")
  ) {
    details.mealSource = "home_cooked";
    details.venue = details.venue ?? "home";
  }

  if (
    normalized.includes("no travel") ||
    normalized.includes("no transport") ||
    (/\bno\b/.test(normalized) && normalized.includes("home")) ||
    (followUpQuestion && /transport|travel|mode/i.test(followUpQuestion) && normalized.includes("home"))
  ) {
    details.guestTravel = "none";
    details.venue = details.venue ?? "home";
  } else if (normalized.includes("some guests") || normalized.includes("some traveled")) {
    details.guestTravel = "some";
  } else if (normalized.includes("not sure")) {
    details.guestTravel = "unknown";
  }

  if (fieldMatches(missingFields, ["venue", "location", "place", "where"])) {
    if (normalized.includes("home")) details.venue = "home";
    if (normalized.includes("elsewhere")) details.venue = "elsewhere";
  }

  if (fieldMatches(missingFields, ["guestTravel", "transport", "travel", "mode"])) {
    if (normalized.includes("no") || normalized.includes("none")) {
      details.guestTravel = "none";
      details.venue = details.venue ?? "home";
    }
  }

  return details;
}

function detailsFromFollowUpReply(
  reply: string,
  activity: PandaParseResult["extractedActivities"][number],
  profile: UserProfile,
  missingFields: string[] = [],
  followUpQuestion: string | null = null,
  originalText = "",
): Record<string, unknown> {
  const normalized = reply.toLowerCase();
  const details: Record<string, unknown> = genericDetailsFromFollowUpReply(reply, missingFields, followUpQuestion);
  Object.assign(details, parseSchemaFollowUpReply(reply, activity, missingFields));
  Object.assign(
    details,
    parseFollowUpWithPandaProcessor({
      reply,
      activity,
      missingFields,
      followUpQuestion,
      originalText,
      profile,
    }),
  );
  Object.assign(
    details,
    socialLeisureDetailsFromFollowUpReply(reply, activity, missingFields, followUpQuestion, originalText),
  );

  if (activity.category === "food") {
    if (
      normalized.includes("home") ||
      normalized.includes("homemade") ||
      normalized.includes("home made") ||
      normalized.includes("home-cooked") ||
      normalized.includes("home cooked")
    ) {
      details.mealSource = "home_cooked";
    } else if (normalized.includes("canteen")) {
      details.mealSource = "canteen";
    } else if (normalized.includes("restaurant")) {
      details.mealSource = "restaurant";
    } else if (normalized.includes("order") || normalized.includes("delivery")) {
      details.mealSource = "ordered_online";
    } else if (normalized.includes("packed") || normalized.includes("tiffin")) {
      details.mealSource = "packed";
    } else if (normalized.includes("skip")) {
      details.mealSource = "skipped";
    }

    if (
      normalized.includes("veg") ||
      normalized.includes("poha") ||
      normalized.includes("dal") ||
      normalized.includes("rice")
    ) {
      details.foodType = "vegetarian_low_dairy";
    } else if (normalized.includes("egg")) {
      details.foodType = "egg";
    } else if (normalized.includes("chicken") || normalized.includes("fish")) {
      details.foodType = "chicken_fish";
    } else if (normalized.includes("mutton") || normalized.includes("beef") || normalized.includes("red meat")) {
      details.foodType = "red_meat";
    }
  }

  if (activity.category === "transport") {
    const isFlight = isFlightTransport(
      { ...activity.details, ...details },
      activity.label,
      activity.activityType,
    );
    const modes: Array<[string, string[]]> = [
      ["flight", ["flight", "plane", "airplane", "airport"]],
      ["walk", ["walk"]],
      ["cycle", ["cycle", "cycled"]],
      ["scooter", ["scooter", "scooty"]],
      ["bus", ["bus"]],
      ["metro", ["metro"]],
      ["auto", ["auto", "rickshaw"]],
      ["car", ["car"]],
      ["cab", ["cab", "taxi", "uber", "ola"]],
      ["carpool", ["carpool", "pooled"]],
    ];
    const mode = modes.find(([, tokens]) => tokens.some((token) => normalized.includes(token)))?.[0];
    if (mode) details.mode = mode;

    const distanceKm = parseDistanceFromReply(reply);
    const hours = parseHoursFromReply(reply);
    if (typeof distanceKm === "number") {
      details.distanceKm = distanceKm;
    } else if (
      typeof hours === "number" &&
      fieldMatches(missingFields, ["distance", "distanceKm"]) &&
      !isFlight
    ) {
      const estimatedDistanceKm = estimatedDistanceFromDurationHours(
        String(details.mode ?? activity.details.mode ?? ""),
        hours,
      );
      details.durationHours = hours;
      if (typeof estimatedDistanceKm === "number") {
        details.distanceKm = estimatedDistanceKm;
        details.distanceEstimatedFromDuration = true;
      }
    } else if (
      !isFlight &&
      (normalized.includes("add distance") ||
        normalized.includes("same distance") ||
        normalized.includes("same route") ||
        normalized.includes("usual distance") ||
        normalized.includes("usual route") ||
        normalized === "work" ||
        normalized.includes("work-related") ||
        normalized.includes("work related") ||
        normalized === "personal" ||
        normalized.includes("personal trip"))
    ) {
      if (typeof profile.core.usualCommuteDistanceKm === "number") {
        details.distanceKm = profile.core.usualCommuteDistanceKm;
      }
      if (
        normalized === "work" ||
        normalized.includes("work-related") ||
        normalized.includes("work related")
      ) {
        details.tripPurpose = "work";
      } else if (normalized === "personal" || normalized.includes("personal trip")) {
        details.tripPurpose = "personal";
      }
    }

    if (isFlight) {
      const city = parseKnownCityFromText(reply.trim());
      if (city) {
        if (
          fieldMatches(missingFields, ["origin", "from", "departure", "departurecity", "departure_city"])
        ) {
          details.origin = city.label;
        } else if (fieldMatches(missingFields, ["destination", "to", "arrival"])) {
          details.destination = city.label;
        } else if (!activity.details.origin && !details.origin) {
          details.origin = city.label;
        }
      }
      Object.assign(
        details,
        inferFlightRouteFromContext({ ...activity.details, ...details }, activity.label, activity.activityType),
      );
    }
  }

  if (activity.category === "energy") {
    const hours = parseHoursFromReply(reply);
    if (typeof hours === "number") details.extraAcHours = hours;
    if (typeof hours === "number") details.durationHours = hours;
    if (normalized.includes("high")) details.energyLevel = "high";
  }

  if (
    activity.primaryCategory === "digital_devices" ||
    activity.category === "digital" ||
    /\b(laptop|phone|streaming|gaming|video call)\b/i.test(`${reply} ${originalText}`)
  ) {
    if (normalized.includes("laptop")) {
      details.subcategory = "laptop_use";
    } else if (normalized.includes("phone")) {
      details.subcategory = "phone_use";
    } else if (normalized.includes("stream")) {
      details.subcategory = "streaming";
    } else if (normalized.includes("video call")) {
      details.subcategory = "video_calls";
    }

    const hours = parseHoursFromReply(reply);
    if (typeof hours === "number") {
      details.durationHours = hours;
    } else if (
      normalized.includes("laptop") &&
      /\b(work from home|worked from home|wfh|working from home)\b/i.test(originalText)
    ) {
      details.durationHours = 6;
    }
  }

  if (
    activity.primaryCategory === "work_study" ||
    /\b(work from home|worked from home|wfh)\b/i.test(originalText)
  ) {
    if (normalized.includes("home") || normalized.includes("wfh")) {
      details.workMode = "work_from_home";
      details.subcategory = "work_from_home";
    }
  }

  if (activity.category === "delivery" || activity.category === "shopping") {
    if (normalized.includes("food")) details.deliveryType = "foodDelivery";
    if (normalized.includes("express")) details.deliveryType = "expressDelivery";
    if (normalized.includes("plastic")) details.packaging = "plastic_heavy";
  }

  if (activity.category === "waste") {
    if (normalized.includes("recycl")) details.wasteType = "recycled";
    if (normalized.includes("compost")) details.wasteType = "composted";
    if (normalized.includes("food")) details.wasteType = "foodWaste";
    if (normalized.includes("plastic")) details.wasteType = "plasticHeavy";
  }

  if (
    activity.category === "special" &&
    `${activity.activityType} ${activity.label}`.toLowerCase().includes("car wash")
  ) {
    details.specialType = "car_wash";

    if (normalized.includes("water only") || normalized.includes("just water") || normalized === "water") {
      details.waterUse = "water_only";
      details.cleaningProducts = false;
    } else if (normalized.includes("cleaning product") || normalized.includes("soap") || normalized.includes("shampoo")) {
      details.waterUse = "water_and_cleaning_products";
      details.cleaningProducts = true;
    } else if (normalized.includes("not sure")) {
      details.waterUse = "unknown";
      details.cleaningProducts = "unknown";
    }
  }

  return details;
}

export function applyFollowUpReplyToPendingParse(
  day: ActivityDay | undefined,
  profile: UserProfile,
  todayDate: string,
  parse: PandaParseResult,
  reply: string,
  patterns: BehaviorPattern[] = [],
): PandaFollowUpResult {
  const parseWithActivities = ensurePendingActivities(parse, profile);
  const conversationReplies = [...(parse.conversationReplies ?? []), reply.trim()];
  const mergedParse: PandaParseResult = {
    ...parseWithActivities,
    conversationReplies,
    extractedActivities: parseWithActivities.extractedActivities.map((activity) => {
      const normalizedActivity = normalizeSocialLeisureActivity(
        activity,
        buildConversationText({ ...parse, conversationReplies }),
      );
      const followUpDetails = detailsFromFollowUpReply(
        reply,
        normalizedActivity,
        profile,
        parse.missingFields,
        parse.followUpQuestion,
        buildConversationText({ ...parse, conversationReplies }),
      );
      const mergedDetails = {
        ...normalizedActivity.details,
        ...followUpDetails,
        ...inferFlightRouteFromContext(
          { ...normalizedActivity.details, ...followUpDetails },
          parse.originalText,
          normalizedActivity.label,
          normalizedActivity.activityType,
        ),
      };

      return {
        ...normalizedActivity,
        status: normalizedActivity.status ?? "confirmed",
        details: mergedDetails,
      };
    }),
  };

  const nextPending = nextPendingParseAfterReply(mergedParse, profile);

  if (nextPending.followUpQuestion) {
    return {
      patterns,
      pendingParse: nextPending,
      assistantMessage: nextPending.assistantMessage,
      saved: false,
    };
  }

  const applied = applyPandaParseToDay(day, profile, todayDate, nextPending, patterns);
  const loggedLabel = nextPending.extractedActivities[0]?.label;
  return {
    day: applied.day,
    patterns: applied.patterns,
    assistantMessage: loggedLabel ? `Logged ${loggedLabel}. Anything else to log?` : "Logged to today's trail. Anything else to log?",
    saved: true,
  };
}

export function applyQuickReply(
  day: ActivityDay | undefined,
  profile: UserProfile,
  todayDate: string,
  reply: string,
  patterns: BehaviorPattern[],
): { day: ActivityDay; patterns: BehaviorPattern[] } {
  const partial = applyQuickReplyToParse(reply, profile);
  if (!partial) {
    return {
      day:
        day ??
        applyPandaParseToDay(undefined, profile, todayDate, {
          detectedIntent: "unknown",
          detectedSlotId: null,
          detectedTime: null,
          assistantMessage: "",
          extractedActivities: [],
          missingFields: [],
          followUpQuestion: null,
          quickReplies: [],
          suggestedProfileUpdate: null,
          confidence: 0,
          originalText: reply,
          usedGemini: false,
        }).day,
      patterns,
    };
  }

  const dayId = day?.id ?? `${profile.id}-${todayDate}`;
  const entry = buildActivityEntry(partial, dayId, profile);
  const merged = finalizeActivityDay(
    {
      ...(day ?? emptyDay(profile, todayDate)),
      activities: mergeActivitiesBySlots(day?.activities ?? [], [entry], ["morning_commute"]),
      status: "mixed",
      updatedAt: new Date().toISOString(),
    },
    profile,
  );

  const nextPatterns = recordBehaviorConfirmation(
    patterns,
    "morning_commute",
    dayOfWeekForDate(todayDate),
    "transport",
    "mode",
    String(partial.details?.mode ?? "unknown"),
  );

  return { day: merged, patterns: nextPatterns };
}
