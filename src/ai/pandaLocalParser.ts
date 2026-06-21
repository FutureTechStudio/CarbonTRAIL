import type { UserProfile } from "@/types";
import { parseActivityText } from "@/logic/parserFallback";
import type { CheckpointSlotId, PandaContext, PandaIntent, PandaParseResult } from "./pandaSchemas";
import { checkpointIdToSlot, detectActivityFragments, detectedFragmentToActivityFragment, timeToCheckpointId } from "./pandaFragmentParser";

function hasAny(input: string, list: string[]): boolean {
  return list.some((word) => input.includes(word));
}

export function parseTimeFromText(text: string, fallbackTime: string): { time: string; isNow: boolean } {
  const normalized = text.toLowerCase();
  const match = normalized.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) {
    if (hasAny(normalized, ["now", "right now", "just now", "leaving now", "leaving for"])) {
      return { time: fallbackTime, isNow: true };
    }
    return { time: fallbackTime, isNow: false };
  }

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return {
    time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    isNow: false,
  };
}

export function inferSlotFromTime(time: string, text: string): CheckpointSlotId {
  const normalized = text.toLowerCase();
  const hour = Number(time.split(":")[0]);

  if (hasAny(normalized, ["breakfast", "breakfat", "poha", "idli", "dosa", "bread and eggs", "morning meal"])) {
    return "breakfast";
  }
  if (hasAny(normalized, ["lunch", "afternoon meal"])) return "lunch";
  if (hasAny(normalized, ["tea", "biscuit", "biscuits", "snack", "coffee", "chai"])) {
    return hour >= 15 && hour < 19 ? "afternoon_activity" : hour >= 19 ? "dinner" : "breakfast";
  }
  if (hasAny(normalized, ["tv", "television", "netflix", "streaming", "watched"])) {
    return hour >= 18 ? "night_energy" : "afternoon_activity";
  }
  if (hasAny(normalized, ["dinner", "supper", "biryani", "ordered chicken"])) return "dinner";
  if (hasAny(normalized, ["recycl", "waste", "plastic bottle"])) return "waste_final";
  if (hasAny(normalized, ["ac", "air conditioner", "night energy", "at night"])) return "night_energy";
  if (hasAny(normalized, ["parcel", "delivery", "shopping", "ordered online"])) return "shopping_delivery";
  if (hasAny(normalized, ["office", "commute", "bus", "scooter", "leaving for office", "went to office"])) {
    return hour >= 15 ? "evening_commute" : "morning_commute";
  }
  if (hasAny(normalized, ["work", "study", "class"])) return hour >= 12 && hour < 15 ? "afternoon_activity" : "work_study";
  if (hour < 10) return "morning_commute";
  if (hour < 14) return "lunch";
  if (hour < 18) return "afternoon_activity";
  if (hour < 21) return "dinner";
  return "night_energy";
}

function detectIntent(text: string): PandaIntent {
  const normalized = text.toLowerCase();

  if (
    hasAny(normalized, ["at 8", "at 9", "this morning", "went to", "had breakfast", "8am", "8 am"]) &&
    hasAny(normalized, ["office", "commute", "bus", "metro", "scooter", "train"])
  ) {
    return "backfill";
  }

  if (hasAny(normalized, ["check my footprint", "how am i doing", "day summary", "finalize day"])) {
    return "finalize_day";
  }
  if (hasAny(normalized, ["correction", "actually", "instead", "change that", "not "])) return "correction";
  if (hasAny(normalized, ["what is", "how does", "why", "where are you", "who are you", "?"])) {
    return "question";
  }
  if (hasAny(normalized, ["at 8", "at 8am", "this morning", "earlier", "went to", "had breakfast"])) {
    return "backfill";
  }
  if (hasAny(normalized, ["now", "leaving", "just", "currently"])) return "live_log";
  return "live_log";
}

function buildCommuteFollowUp(profile?: UserProfile): Pick<PandaParseResult, "followUpQuestion" | "quickReplies" | "missingFields"> {
  const mode = profile?.core.usualCommuteMode;
  if (mode === "scooter" || mode === "cycle") {
    return {
      followUpQuestion: "Are you taking your usual scooter ride to office?",
      quickReplies: ["Yes, scooter", "Bus", "Auto", "Carpool", "Different travel"],
      missingFields: ["travel_mode"],
    };
  }
  return {
    followUpQuestion: "How are you getting to office today?",
    quickReplies: ["Scooter", "Bus", "Auto", "Carpool", "Walk"],
    missingFields: ["travel_mode"],
  };
}

export function parsePandaMessageLocal(message: string, context: PandaContext, profile?: UserProfile): PandaParseResult {
  const normalized = message.toLowerCase();
  const intent = detectIntent(message);
  const { time, isNow } = parseTimeFromText(message, context.currentTime);
  let slot = inferSlotFromTime(time, message);
  const detectedFragments = detectActivityFragments(message, time);

  if (intent === "finalize_day") {
    const missing = Object.entries(context.checkpointStatuses)
      .filter(([, status]) => status === "missing" || status === "estimated")
      .map(([id]) => id);
    return {
      detectedIntent: intent,
      detectedSlotId: "day_summary",
      detectedTime: null,
      assistantMessage:
        missing.length > 0
          ? `Your trail still has gaps (${missing.slice(0, 3).join(", ")}). Want to fill them now?`
          : "Your trail looks fairly complete. Want to finalize today?",
      extractedActivities: [],
      missingFields: missing,
      followUpQuestion: null,
      quickReplies: ["Fill commute", "Fill meals", "Fill energy", "Finalize day"],
      suggestedProfileUpdate: null,
      confidence: 0.7,
      originalText: message,
      usedGemini: false,
    };
  }

  const legacy = parseActivityText(message, profile);
  const extractedActivities = legacy.activities.map((activity) => {
    const detailsText = `${activity.label ?? ""} ${activity.activityType ?? ""} ${Object.values(activity.details ?? {}).join(" ")}`;
    const activityTime = typeof activity.details?.eventTime === "string" ? activity.details.eventTime : time;
    const activityCheckpointId =
      typeof activity.details?.timeCheckpointId === "string"
        ? activity.details.timeCheckpointId
        : timeToCheckpointId(activityTime);
    const activitySlot = activity.details?.timeSlot
      ? (activity.details.timeSlot as CheckpointSlotId)
      : checkpointIdToSlot(activityCheckpointId, detailsText);
    return {
    category: activity.category ?? "special",
    primaryCategory: activity.primaryCategory,
    rawPrimaryCategory: activity.rawPrimaryCategory,
    subcategory: activity.subcategory,
    categoryScore: activity.categoryScore,
    scoreMeaning: activity.scoreMeaning,
    greenScore: activity.greenScore,
    dominantImpact: activity.dominantImpact,
    activityType: activity.activityType ?? "manual_update",
    label: activity.label ?? "Activity update",
    timeSlot: activitySlot,
    details: {
      ...(activity.details ?? {}),
      loggedTime: time,
      eventTime: activityTime,
      timeCheckpointId: activityCheckpointId,
      isLiveLog: isNow,
    },
    confidence: 0.85,
    status: "confirmed" as const,
    };
  });

  let followUpQuestion = legacy.followUpQuestion ?? null;
  let quickReplies = legacy.followUpChips ?? [];
  let missingFields: string[] = [];
  let assistantMessage = "Got it — I logged that for your trail.";

  if (intent === "question") {
    if (hasAny(normalized, ["where are you from", "who are you", "what are you"])) {
      return {
        detectedIntent: intent,
        detectedSlotId: null,
        detectedTime: time,
        assistantMessage:
          "I'm Panda AI — CarbonTrail's environmentally aware assistant. I help turn daily choices into a carbon trail. What did you do today?",
        extractedActivities: [],
        missingFields: [],
        followUpQuestion: "Want to log commute, meals, or energy use?",
        quickReplies: ["Commute", "Meals", "Energy", "Check my footprint"],
        suggestedProfileUpdate: null,
        confidence: 0.9,
        originalText: message,
        usedGemini: false,
      };
    }
  }

  if (hasAny(normalized, ["hey", "hello", "hi", "good morning", "good afternoon"])) {
    assistantMessage = "Hey! I'm Panda. Tell me what happened today — commute, meals, energy, anything.";
    followUpQuestion = "What should we log first?";
    quickReplies = ["Commute", "Meals", "Energy", "Delivery"];
  } else if (normalized.trim() === "afternoon" || hasAny(normalized, ["this afternoon", "afternoon activity"])) {
    slot = "afternoon_activity";
    assistantMessage = "Want to log your afternoon — work, a break, shopping, or heading home?";
    followUpQuestion = null;
    quickReplies = ["Office work", "Snack / break", "Shopping", "Commute home"];
  } else if (
    hasAny(normalized, ["leaving for office", "leaving for work", "heading to office"]) &&
    !legacy.activities.some((a) => a.details?.mode)
  ) {
    slot = "morning_commute";
    const followUp = buildCommuteFollowUp(profile);
    followUpQuestion = followUp.followUpQuestion;
    quickReplies = followUp.quickReplies;
    missingFields = followUp.missingFields;
    assistantMessage = "I'll help turn your day into a carbon trail. Tell me how you're traveling.";
    extractedActivities.length = 0;
  } else if (hasAny(normalized, ["went to office", "office at", "in a bus", "in bus", "took a bus"])) {
    slot = Number(time.split(":")[0]) >= 15 || hasAny(normalized, ["return", "home from office", "back home"])
      ? "evening_commute"
      : "morning_commute";
    assistantMessage =
      slot === "evening_commute"
        ? "Got it — I logged your return commute."
        : "Got it — I logged your morning commute. What did you have for lunch today?";
    quickReplies =
      slot === "evening_commute"
        ? ["Yes, add distance", "Same route", "Different distance", "Skip distance"]
        : ["Home food", "Office canteen", "Restaurant", "Ordered online", "Skipped"];
    followUpQuestion = null;
  } else if (hasAny(normalized, ["chicken biryani", "ordered"]) && hasAny(normalized, ["dinner", "night"])) {
    slot = "dinner";
    assistantMessage = "Logged your dinner order. I can use your Carbon Memory if you skip other details.";
  } else if (hasAny(normalized, ["ac for", "used ac", "air conditioner"])) {
    slot = "night_energy";
    assistantMessage = "Logged your night energy use.";
  } else if (hasAny(normalized, ["recycled", "recycling"])) {
    slot = "waste_final";
    assistantMessage = "Nice — recycling logged. No worries, even small actions teach us something.";
  } else if (hasAny(normalized, ["home food", "home cooked", "lunch"])) {
    slot = "lunch";
    assistantMessage = "Logged lunch. Want to sharpen today's trail with a few quick details?";
  } else if (extractedActivities.length >= 2) {
    assistantMessage = "Got it — I logged those for your trail.";
    followUpQuestion = null;
    quickReplies = [];
  } else if (extractedActivities.length === 1 && hasAny(normalized, ["tea", "biscuit", "tv", "watched"])) {
    assistantMessage = "Got it — logged for your trail.";
    followUpQuestion = null;
  } else if (extractedActivities.length === 0) {
    assistantMessage = "Tell Panda what happened today — I'll help turn it into a carbon trail.";
    followUpQuestion = "What part of your day should we log first?";
    quickReplies = ["Commute", "Meals", "Energy", "Delivery"];
  }

  if (followUpQuestion && extractedActivities.length > 0 && legacy.needsFollowUp) {
    assistantMessage = legacy.followUpQuestion ?? assistantMessage;
  }

  return {
    detectedIntent: intent,
    detectedSlotId: slot,
    detectedTime: time,
    assistantMessage,
    activityFragments: detectedFragments.map((fragment) =>
      detectedFragmentToActivityFragment(fragment, {
        activityLabel: fragment.fragmentText,
        score: 3,
      }),
    ),
    extractedActivities,
    missingFields,
    followUpQuestion,
    quickReplies,
    suggestedProfileUpdate: legacy.suggestedProfileUpdate
      ? {
          shouldSuggest: true,
          label: legacy.suggestedProfileUpdate.label,
          key: legacy.suggestedProfileUpdate.key,
          value: legacy.suggestedProfileUpdate.value,
        }
      : null,
    confidence: extractedActivities.length > 0 ? 0.82 : 0.45,
    originalText: message,
    usedGemini: false,
  };
}
