import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import { parsePandaMessageLocal } from "@/ai/pandaLocalParser";
import { buildPandaContext, parsePandaMessage } from "@/ai/pandaAiService";
import { validatePandaParseResult } from "@/ai/pandaValidator";
import { extractJsonFromAiText, normalizePandaAiPayload } from "@/ai/pandaResponseNormalizer";
import { inferStatusFromProbability } from "@/ai/behaviorProbability";
import { applyFollowUpReplyToPendingParse, applyPandaParseToDay } from "@/ai/pandaDayActions";
import { awardPoints } from "@/logic/leafPoints";
import type { PandaParseResult, PandaProcessingStep } from "@/ai/pandaSchemas";

function contextAt(hour: number, minute = 0) {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return buildPandaContext(demoGuestProfile, "2025-06-20", now);
}

describe("pandaLocalParser", () => {
  it('parses "I\'m leaving for office now" as live commute follow-up', () => {
    const parsed = parsePandaMessageLocal("I'm leaving for office now.", contextAt(8, 15), demoGuestProfile);
    expect(parsed.detectedIntent).toBe("live_log");
    expect(parsed.detectedSlotId).toBe("morning_commute");
    expect(parsed.followUpQuestion).toContain("scooter");
    expect(parsed.quickReplies).toContain("Bus");
  });

  it('parses "I went to office at 8AM in a bus" as backfill commute', () => {
    const parsed = parsePandaMessageLocal(
      "Hey I want to check my footprint. I went to office at 8AM in the morning, in a bus.",
      contextAt(13),
      demoGuestProfile,
    );
    expect(parsed.detectedSlotId).toBe("morning_commute");
    expect(parsed.detectedTime).toBe("08:00");
    expect(parsed.extractedActivities.some((item) => item.details.mode === "bus")).toBe(true);
  });

  it('parses "I took a bus at 7 PM to return home from office" as evening commute', () => {
    const parsed = parsePandaMessageLocal(
      "I took a bus at 7 PM to return home from office",
      contextAt(21),
      demoGuestProfile,
    );
    expect(parsed.detectedSlotId).toBe("evening_commute");
    expect(parsed.detectedTime).toBe("19:00");
    expect(parsed.extractedActivities.some((item) => item.details.mode === "bus")).toBe(true);
  });

  it('parses "I ordered chicken biryani for dinner"', () => {
    const parsed = parsePandaMessageLocal("I ordered chicken biryani for dinner.", contextAt(20), demoGuestProfile);
    expect(parsed.detectedSlotId).toBe("dinner");
    expect(parsed.extractedActivities.length).toBeGreaterThan(0);
  });

  it('parses "Used AC for 4 hours"', () => {
    const parsed = parsePandaMessageLocal("Used AC for 4 hours at night.", contextAt(22), demoGuestProfile);
    expect(parsed.detectedSlotId).toBe("night_energy");
    expect(parsed.extractedActivities.some((item) => item.details.extraAcHours === 4)).toBe(true);
  });

  it("parses explicit flight time and route even when the message says now", () => {
    const parsed = parsePandaMessageLocal(
      "I will take a flight to London from Delhi at 11:30 AM now",
      contextAt(10, 23),
      demoGuestProfile,
    );

    expect(parsed.detectedTime).toBe("11:30");
    expect(parsed.extractedActivities[0].details.mode).toBe("flight");
    expect(parsed.extractedActivities[0].details.origin).toBe("Delhi");
    expect(parsed.extractedActivities[0].details.destination).toBe("London");
    expect(parsed.extractedActivities[0].details.distanceKm).toBeGreaterThan(6000);
  });
});

describe("pandaAiService", () => {
  it("uses local parser when Gemini is disabled", async () => {
    const parsed = await parsePandaMessage("Used AC for 4 hours", contextAt(21), demoGuestProfile);
    expect(parsed.usedGemini).toBe(false);
    expect(parsed.extractedActivities.length).toBeGreaterThan(0);
  });

  it("falls back when AI JSON is completely invalid", () => {
    expect(validatePandaParseResult({ foo: "bar" })).toBeNull();
  });

  it("accepts minimal Mistral-style greeting payload", () => {
    const parsed = validatePandaParseResult(
      {
        intent: "question",
        message: "Hey! I'm Panda. What did you do today?",
        quick_replies: ["Commute", "Meals"],
      },
      "mistral",
      "hi",
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.usedMistral).toBe(true);
    expect(parsed?.assistantMessage).toContain("Panda");
    expect(parsed?.quickReplies).toEqual(["Commute", "Meals"]);
  });

  it("unwraps fenced JSON from model output", () => {
    const raw = extractJsonFromAiText(
      '```json\n{"assistantMessage":"Hello","detectedIntent":"question","extractedActivities":[],"missingFields":[],"quickReplies":[]}\n```',
    );
    const parsed = validatePandaParseResult(raw, "mistral", "hi");
    expect(parsed?.assistantMessage).toBe("Hello");
  });

  it("normalizes nested schema wrappers", () => {
    const normalized = normalizePandaAiPayload({
      schema: {
        assistantMessage: "Nested reply",
        detectedIntent: "unknown",
      },
    });
    expect(normalized?.assistantMessage).toBe("Nested reply");
  });

  it("does not treat echoed user message as assistant reply", () => {
    const normalized = normalizePandaAiPayload({
      message: "hi",
      context: { currentTime: "09:00" },
      schema: { detectedIntent: "live_log | backfill" },
    });
    expect(normalized).toBeNull();
  });

  it("normalizes new multi-event AI payloads into app categories and scores", () => {
    const parsed = validatePandaParseResult(
      {
        assistantMessage: "Logged your commute and lunch.",
        detectedIntent: "backfill",
        events: [
          {
            rawPrimaryCategory: "mobility",
            subcategory: "Bus commute",
            activityLabel: "Bus to office",
            categoryScore: 3,
            scoreMeaning: "medium",
            details: { mode: "bus", distanceKm: 8 },
            timeSlot: "morning_commute",
            confidence: 0.9,
          },
          {
            primaryCategory: "food_meals",
            subcategory: "Chicken/Fish meal",
            activityLabel: "Chicken biryani lunch",
            categoryScore: 6,
            details: { foodType: "chicken_fish" },
            timeSlot: "lunch",
            confidence: 0.82,
          },
        ],
        missingFields: ["mealSource"],
        followUpQuestion: "Was the biryani home-cooked, restaurant, or ordered online?",
        quickReplies: ["Home cooked", "Restaurant", "Ordered online"],
      },
      "mistral",
      "I went to office by bus and had chicken biryani for lunch",
    );

    expect(parsed?.extractedActivities).toHaveLength(2);
    expect(parsed?.extractedActivities[0].primaryCategory).toBe("transportation");
    expect(parsed?.extractedActivities[0].category).toBe("transport");
    expect(parsed?.extractedActivities[0].categoryScore).toBe(3);
    expect(parsed?.extractedActivities[1].primaryCategory).toBe("food_meals");
    expect(parsed?.extractedActivities[1].category).toBe("food");
  });

  it("normalizes activityFragments plus events shape into extracted activities", () => {
    const parsed = validatePandaParseResult(
      {
        detectedIntent: "live_log",
        activityFragments: [
          {
            fragmentText: "had tea and biscuits around 5 PM",
            primaryCategory: "food_meals",
            subcategories: ["tea_coffee", "snacks"],
            activityLabel: "Tea and biscuits",
            timeCheckpointId: "17",
            eventTime: "17:00",
            details: { items: ["tea", "biscuits"], mealType: "snack" },
            score: 3,
            scoreMeaning: "medium",
            co2EstimateKg: null,
            missingFields: [],
            confidence: 0.86,
          },
        ],
        events: [
          {
            primaryCategory: "digital_devices",
            subcategory: "TV",
            activityLabel: "Watched TV",
            score: 3,
            scoreMeaning: "medium",
            timeCheckpointId: "17",
            eventTime: "17:00",
            details: { deviceType: "tv", durationHours: 2 },
            dominantImpact: false,
            missingFields: [],
            confidence: 0.9,
            status: "confirmed",
          },
        ],
        followUpQuestion: null,
        quickReplies: [],
        assistantMessage: "Logged tea and biscuits as a snack, and TV time as device use around 5 PM.",
        confidence: 0.9,
      },
      "gemini",
      "I had tea and biscuits around 5 PM and watched TV for 2 hours.",
    );

    expect(parsed?.activityFragments).toHaveLength(1);
    expect(parsed?.extractedActivities).toHaveLength(1);
    expect(parsed?.extractedActivities[0].primaryCategory).toBe("digital_devices");
    expect(parsed?.extractedActivities[0].timeSlot).toBe("afternoon_activity");
    expect(parsed?.extractedActivities[0].details.timeCheckpointId).toBe("17");
  });

  it("keeps unresolvable AI categories in other_unknown for clarification", () => {
    const parsed = validatePandaParseResult(
      {
        assistantMessage: "I need to classify this.",
        detectedIntent: "live_log",
        events: [
          {
            rawPrimaryCategory: "ritual atmosphere",
            activityLabel: "Unclear activity",
            details: {},
            timeSlot: "day_summary",
            confidence: 0.4,
          },
        ],
        missingFields: [],
        quickReplies: [],
      },
      "mistral",
      "I did something unusual",
    );

    expect(parsed?.extractedActivities[0].primaryCategory).toBe("other_unknown");
    expect(parsed?.extractedActivities[0].category).toBe("special");
  });

  it("reports local processing steps while parsing", async () => {
    const steps: PandaProcessingStep[] = [];
    await parsePandaMessage("I took a bus at 7 PM to return home from office", contextAt(21), demoGuestProfile, {
      onStep: (step) => steps.push(step),
    });

    expect(steps).toContain("understanding_message");
    expect(steps).toContain("classifying_categories");
    expect(steps).toContain("checking_app_mapping");
  });
});

describe("panda follow-up logging", () => {
  it("logs a pending breakfast activity when the user answers homemade", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "breakfast",
      detectedTime: "07:00",
      assistantMessage: "Where was it sourced from?",
      extractedActivities: [
        {
          category: "food",
          activityType: "breakfast",
          label: "Poha breakfast",
          timeSlot: "breakfast",
          details: { foodType: "vegetarian" },
          confidence: 0.85,
          status: "confirmed",
        },
      ],
      missingFields: ["mealSource"],
      followUpQuestion: "Where was it sourced from?",
      quickReplies: ["Homemade", "Canteen"],
      suggestedProfileUpdate: null,
      confidence: 0.85,
      originalText: "I had Poha in breakfast at 7 am",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-20",
      pending,
      "Homemade",
      [],
    );

    expect(result.day!.activities).toHaveLength(1);
    expect(result.day!.activities[0].label).toBe("Poha breakfast");
    expect(result.day!.activities[0].details.mealSource).toBe("home_cooked");
    expect(result.day!.activities[0].details.loggedTime).toBe("07:00");
    expect(result.day!.totals.createdCo2eKg).toBeGreaterThan(0);
  });

  it("adds usual commute distance when the user confirms a Sunday work trip", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "morning_commute",
      detectedTime: "09:00",
      assistantMessage: "Got it! Since today is Sunday, was this trip work-related or personal?",
      extractedActivities: [
        {
          category: "transport",
          activityType: "commute_outbound",
          label: "Scooter commute to office",
          timeSlot: "morning_commute",
          details: { mode: "scooter" },
          confidence: 0.85,
          status: "confirmed",
        },
      ],
      missingFields: ["tripPurpose"],
      followUpQuestion: "Since today is Sunday, was this trip work-related or personal?",
      quickReplies: ["Work", "Personal"],
      suggestedProfileUpdate: null,
      confidence: 0.85,
      originalText: "I travelled to office around 9 AM",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "Work",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities).toHaveLength(1);
    expect(result.day!.activities[0].details.mode).toBe("scooter");
    expect(result.day!.activities[0].details.distanceKm).toBe(demoGuestProfile.core.usualCommuteDistanceKm);
    expect(result.day!.activities[0].details.tripPurpose).toBe("work");
    expect(result.day!.activities[0].estimates.co2eKg).toBeGreaterThan(0);
    expect(result.day!.activities[0].estimates.savedCo2eKg).toBe(0);
  });

  it("adds usual commute distance when the user confirms distance for a pending bus ride", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "evening_commute",
      detectedTime: "19:00",
      assistantMessage: "Got it! A bus ride at 7 PM is a great alternative.",
      extractedActivities: [
        {
          category: "transport",
          activityType: "return_commute",
          label: "Return home by bus",
          timeSlot: "evening_commute",
          details: { mode: "bus" },
          confidence: 0.85,
          status: "confirmed",
        },
      ],
      missingFields: ["distanceKm"],
      followUpQuestion: "Add your usual commute distance?",
      quickReplies: ["Yes, add distance"],
      suggestedProfileUpdate: null,
      confidence: 0.85,
      originalText: "I took a bus at 7 PM to return home from office",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-20",
      pending,
      "Yes, add distance",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities).toHaveLength(1);
    expect(result.day!.activities[0].details.mode).toBe("bus");
    expect(result.day!.activities[0].details.distanceKm).toBe(demoGuestProfile.core.usualCommuteDistanceKm);
    expect(result.day!.activities[0].details.loggedTime).toBe("19:00");
    expect(result.day!.totals.createdCo2eKg).toBeGreaterThan(0);
  });

  it("uses a car wash follow-up answer in the saved estimate", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "lunch",
      detectedTime: "11:00",
      assistantMessage: "Got it! Did you use water and cleaning products for the car wash?",
      extractedActivities: [
        {
          category: "special",
          activityType: "car_wash",
          label: "Car wash at 11",
          timeSlot: "lunch",
          details: {},
          confidence: 0.8,
          status: "confirmed",
        },
      ],
      missingFields: ["waterUse"],
      followUpQuestion: "Did you use any cleaning products or just water?",
      quickReplies: ["Water only", "Cleaning products", "Not sure"],
      suggestedProfileUpdate: null,
      confidence: 0.8,
      originalText: "I will go to wash my car at 11",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-20",
      pending,
      "Water only",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities).toHaveLength(1);
    expect(result.day!.activities[0].details.specialType).toBe("car_wash");
    expect(result.day!.activities[0].details.waterUse).toBe("water_only");
    expect(result.day!.activities[0].details.cleaningProducts).toBe(false);
    expect(result.day!.activities[0].estimates.co2eKg).toBe(0.08);
    expect(result.day!.activities[0].estimates.savedCo2eKg).toBe(0);
  });

  it("uses generic follow-up fields like hours for energy estimates", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "night_energy",
      detectedTime: "22:00",
      assistantMessage: "How long did you use the AC?",
      extractedActivities: [
        {
          category: "energy",
          activityType: "home_energy",
          label: "AC usage",
          timeSlot: "night_energy",
          details: {},
          confidence: 0.8,
          status: "confirmed",
        },
      ],
      missingFields: ["extraAcHours"],
      followUpQuestion: "How long did you use the AC?",
      quickReplies: [],
      suggestedProfileUpdate: null,
      confidence: 0.8,
      originalText: "Used AC tonight",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-20",
      pending,
      "3 hours",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities[0].details.extraAcHours).toBe(3);
    expect(result.day!.activities[0].details.durationHours).toBe(3);
    expect(result.day!.activities[0].estimates.co2eKg).toBeGreaterThan(0);
  });

  it("uses generic follow-up fields like planned trip for transport metadata", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "night_energy",
      detectedTime: "23:31",
      assistantMessage: "Was this planned or sudden?",
      extractedActivities: [
        {
          category: "transport",
          activityType: "flight",
          label: "Flight from Kolkata to Bangalore",
          timeSlot: "night_energy",
          details: { mode: "flight", distanceKm: 1550 },
          confidence: 0.8,
          status: "confirmed",
        },
      ],
      missingFields: ["tripType"],
      followUpQuestion: "Was this planned or sudden?",
      quickReplies: ["Log as trip", "Update profile", "Skip for now"],
      suggestedProfileUpdate: null,
      confidence: 0.8,
      originalText: "I'm going to bangalore via flight from kolkata now",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-20",
      pending,
      "Planned one-time trip",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities[0].details.mode).toBe("flight");
    expect(result.day!.activities[0].details.tripType).toBe("planned_one_time");
    expect(result.day!.activities[0].primaryCategory).toBe("travel_trips");
    expect(result.day!.activities[0].categoryScore).toBeGreaterThanOrEqual(9);
    expect(result.day!.activities[0].details.followUp).toMatchObject({
      question: "Was this planned or sudden?",
      reply: "Planned one-time trip",
      missingFields: ["tripType"],
    });
    expect(result.day!.activities[0].estimates.factorRefs).toContain("transport.flight");
    expect(result.day!.activities[0].estimates.co2eKg).toBeGreaterThan(0);
  });

  it("enriches remote flight activities that omit mode and distance before saving", () => {
    const parse: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "lunch",
      detectedTime: "11:30",
      assistantMessage: "Got it, logging your flight.",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "travel_trips",
          rawPrimaryCategory: "Travel & Trips",
          subcategory: "Domestic or international flight",
          categoryScore: 10,
          scoreMeaning: "very_high",
          activityType: "flight",
          label: "Flight to London from Delhi",
          timeSlot: "lunch",
          details: {},
          confidence: 0.86,
          status: "confirmed",
        },
      ],
      missingFields: [],
      followUpQuestion: null,
      quickReplies: [],
      suggestedProfileUpdate: null,
      confidence: 0.86,
      originalText: "I will take a flight to London from Delhi at 11:30 AM",
      usedGemini: false,
    };

    const { day } = applyPandaParseToDay(undefined, demoGuestProfile, "2025-06-20", parse, []);

    expect(day.activities[0].primaryCategory).toBe("travel_trips");
    expect(day.activities[0].details.mode).toBe("flight");
    expect(day.activities[0].details.origin).toBe("Delhi");
    expect(day.activities[0].details.destination).toBe("London");
    expect(day.activities[0].details.distanceKm).toBeGreaterThan(6000);
    expect(day.activities[0].estimates.co2eKg).toBeGreaterThan(1000);
  });
});

describe("behaviorProbability", () => {
  it("does not mark medium probability as confirmed", () => {
    expect(inferStatusFromProbability(0.65)).toBe("parsed_pending");
    expect(inferStatusFromProbability(0.85)).toBe("assumed");
  });
});

describe("leafPoints", () => {
  it("does not award points for green-action metadata", () => {
    const result = awardPoints([], {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "walked",
      metadata: { greenAction: true },
    });
    expect(result.awardedPoints).toBe(0);
  });

  it("awards points for commute detail shared", () => {
    const result = awardPoints([], {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Commute detail shared",
    });
    expect(result.awardedPoints).toBe(10);
  });
});

describe("pandaGemini fallback path", () => {
  it("parsePandaMessage resolves without Gemini in local mode", async () => {
    const parsed = await parsePandaMessage("I recycled plastic bottles today", contextAt(18), demoGuestProfile);
    expect(parsed.usedGemini).toBe(false);
    expect(parsed.detectedSlotId).toBe("waste_final");
  });

  it("logs tea and biscuits with TV watching from one message", async () => {
    const parsed = await parsePandaMessage(
      "I had tea and biscuits around 5 PM and watched TV for 2 hours.",
      contextAt(17),
      demoGuestProfile,
    );
    expect(parsed.extractedActivities.length).toBe(2);
    expect(parsed.extractedActivities.some((a) => a.label === "Tea and biscuits")).toBe(true);
    expect(parsed.extractedActivities.some((a) => a.primaryCategory === "food_meals" && (a.categoryScore ?? 0) >= 2 && (a.categoryScore ?? 0) <= 3)).toBe(true);
    expect(parsed.extractedActivities.some((a) => a.primaryCategory === "digital_devices" && a.details.subcategory === "tv")).toBe(true);
    expect(parsed.extractedActivities.every((a) => a.details.timeCheckpointId === "17")).toBe(true);
    expect(parsed.followUpQuestion).toBeNull();
  });

  it("logs all requested multi-category examples locally", async () => {
    const cases = [
      {
        text: "I took a bus to office at 8:30 AM and had breakfast at the office canteen.",
        categories: ["transportation", "work_study", "food_meals"],
      },
      {
        text: "I worked from home today and used AC for 3 hours in the afternoon.",
        categories: ["work_study", "home_energy"],
      },
      {
        text: "I ordered chicken biryani for dinner and threw away the plastic packaging.",
        categories: ["food_meals", "delivery_online_orders", "waste_recycling"],
      },
      {
        text: "I walked to the market and bought vegetables.",
        categories: ["transportation", "shopping_purchases", "positive_avoided_actions"],
      },
    ];

    for (const item of cases) {
      const parsed = await parsePandaMessage(item.text, contextAt(17), demoGuestProfile);
      for (const category of item.categories) {
        expect(parsed.extractedActivities.some((activity) => activity.primaryCategory === category)).toBe(true);
      }
    }
  });
});
