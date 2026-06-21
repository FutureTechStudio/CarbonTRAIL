import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import { applyCompletenessToParse, ensurePendingActivities, getMissingDetailFields } from "@/ai/pandaCompleteness";
import {
  allPandaCategoryProcessorsPresent,
  detectPandaCategoryProcessor,
} from "@/ai/pandaCategoryProcessors";
import { applyFollowUpReplyToPendingParse } from "@/ai/pandaDayActions";
import type { PandaParseResult } from "@/ai/pandaSchemas";

describe("pandaCompleteness", () => {
  it("has generic processors for all Panda primary categories", () => {
    expect(allPandaCategoryProcessorsPresent()).toBe(true);
  });

  it("detects category processors for representative category text", () => {
    const examples = [
      ["I took a bus", "transportation"],
      ["I had tea", "food_meals"],
      ["Used AC", "home_energy"],
      ["Cooked on induction", "cooking_energy"],
      ["Worked from home", "work_study"],
      ["Bought vegetables", "shopping_purchases"],
      ["Received a parcel delivery", "delivery_online_orders"],
      ["Threw plastic packaging", "waste_recycling"],
      ["Took a hot shower", "water_hot_water"],
      ["Watched TV", "digital_devices"],
      ["Used a hair dryer", "personal_care"],
      ["Vacuumed the floor", "household_chores"],
      ["Had a party", "social_leisure"],
      ["Took a flight", "travel_trips"],
      ["Walked instead of driving", "positive_avoided_actions"],
    ] as const;

    for (const [text, category] of examples) {
      expect(detectPandaCategoryProcessor({ text }).primaryCategory).toBe(category);
    }
  });

  it("sanitizes Mistral quick replies against the pending category schema", () => {
    const parse: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "15:00",
      assistantMessage: "How did you travel?",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "transportation",
          activityType: "local_ride",
          label: "Trip to friend's home",
          timeSlot: "afternoon_activity",
          details: {},
          confidence: 0.9,
          status: "confirmed",
        },
      ],
      missingFields: ["mode"],
      followUpQuestion: "How did you travel?",
      quickReplies: ["Teleport", "Cycled"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I went to my friends home at 3 PM",
      usedGemini: false,
      usedMistral: true,
    };

    const enriched = applyCompletenessToParse(parse, demoGuestProfile);
    expect(enriched.quickReplies).toContain("Walked");
    expect(enriched.quickReplies).toContain("Cycled");
    expect(enriched.quickReplies).not.toContain("Teleport");
  });

  it("asks for flight origin when destination is known but origin is missing", () => {
    const parse: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "morning_commute",
      detectedTime: "09:00",
      assistantMessage: "That’s a long-haul flight!",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "travel_trips",
          activityType: "flight",
          label: "Flight to Dubai for official meetings",
          timeSlot: "morning_commute",
          details: { mode: "flight", destination: "Dubai" },
          confidence: 0.9,
          status: "confirmed",
          dominantImpact: true,
        },
      ],
      missingFields: [],
      followUpQuestion: null,
      quickReplies: [],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "Took a flight to Dubai for official meetings around 9 AM",
      usedGemini: false,
    };

    const enriched = applyCompletenessToParse(parse, demoGuestProfile);
    expect(enriched.followUpQuestion).toContain("fly from");
    expect(enriched.missingFields).toContain("origin");
    expect(enriched.quickReplies.length).toBeGreaterThan(0);
  });

  it("continues follow-up rounds until flight route is complete", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "morning_commute",
      detectedTime: "09:00",
      assistantMessage: "Which city are you flying from?",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "travel_trips",
          activityType: "flight",
          label: "Flight to Dubai for official meetings",
          timeSlot: "morning_commute",
          details: { mode: "flight", destination: "Dubai" },
          confidence: 0.9,
          status: "confirmed",
        },
      ],
      missingFields: ["origin"],
      followUpQuestion: "Which city did you fly from?",
      quickReplies: ["Bangalore", "Delhi", "Mumbai"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "Took a flight to Dubai for official meetings around 9 AM",
      usedGemini: false,
    };

    const afterOrigin = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "Bangalore",
      [],
    );

    expect(afterOrigin.saved).toBe(true);
    expect(afterOrigin.day?.activities[0].details.origin).toBe("Bangalore");
    expect(afterOrigin.day?.activities[0].details.distanceKm).toBeGreaterThan(2500);
  });

  it("lists commute distance as missing for transport without distance", () => {
    const missing = getMissingDetailFields(
      {
        category: "transport",
        primaryCategory: "transportation",
        activityType: "commute_outbound",
        label: "Scooter commute to office",
        timeSlot: "morning_commute",
        details: { mode: "scooter" },
        confidence: 0.9,
        status: "confirmed",
      },
      { ...demoGuestProfile, core: { ...demoGuestProfile.core, usualCommuteDistanceKm: undefined } },
      "Travelled to office",
    );

    expect(missing.some((field) => field.key === "distanceKm")).toBe(true);
  });

  it("accepts commute duration as an estimated distance follow-up", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "morning_commute",
      detectedTime: "08:00",
      assistantMessage: "How far was your bus ride to the office?",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "transportation",
          activityType: "commute_outbound",
          label: "Bus to office",
          timeSlot: "morning_commute",
          details: { mode: "bus" },
          confidence: 0.9,
          status: "confirmed",
        },
      ],
      missingFields: ["distanceKm"],
      followUpQuestion: "How far was your bus ride to the office?",
      quickReplies: ["Same as usual", "About 5 km", "About 10 km"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I took a bus to office at 8 AM",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      { ...demoGuestProfile, core: { ...demoGuestProfile.core, usualCommuteDistanceKm: undefined } },
      "2025-06-22",
      pending,
      "1 hour",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day?.activities).toHaveLength(1);
    expect(result.day?.activities[0].details.durationHours).toBe(1);
    expect(result.day?.activities[0].details.distanceEstimatedFromDuration).toBe(true);
    expect(result.day?.activities[0].details.distanceKm).toBeGreaterThan(0);
  });

  it("reconstructs a local trip stub when AI asks travel mode without extractedActivities", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "15:00",
      assistantMessage: "How did you travel to your friend's home?",
      extractedActivities: [],
      missingFields: ["mode"],
      followUpQuestion: "How did you travel to your friend's home?",
      quickReplies: ["Walked", "Cycled", "Took a bus", "Drove"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I went to my friends home at 3 PM",
      usedGemini: true,
    };

    const enriched = ensurePendingActivities(pending, demoGuestProfile);
    expect(enriched.extractedActivities).toHaveLength(1);
    expect(enriched.extractedActivities[0].primaryCategory).toBe("transportation");
    expect(enriched.extractedActivities[0].label).toContain("friend");

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      enriched,
      "Cycled",
      [],
    );

    expect(result.saved).toBe(false);
    expect(result.pendingParse?.extractedActivities[0].details.mode).toBe("cycle");
    expect(result.pendingParse?.extractedActivities[0].details.distanceKm).toBeUndefined();
    expect(result.pendingParse?.followUpQuestion).toContain("How far");
  });

  it("does not use office commute distance for a personal friend-home trip", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "15:00",
      assistantMessage: "How did you travel to your friend's home?",
      extractedActivities: [],
      missingFields: ["mode"],
      followUpQuestion: "How did you travel to your friend's home?",
      quickReplies: ["Walked", "Cycled", "Took a bus", "Drove"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I went to my friends home at 3 PM",
      usedGemini: true,
    };

    const afterMode = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      ensurePendingActivities(pending, demoGuestProfile),
      "Took a bus",
      [],
    );

    expect(afterMode.saved).toBe(false);
    expect(afterMode.pendingParse?.extractedActivities[0].details.mode).toBe("bus");
    expect(afterMode.pendingParse?.extractedActivities[0].details.distanceKm).toBeUndefined();
    expect(afterMode.pendingParse?.followUpQuestion).toContain("How far");
  });

  it("preserves event time and checkpoint when saving a personal car trip distance", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "16:30",
      assistantMessage: "How far was the trip?",
      extractedActivities: [
        {
          category: "transport",
          primaryCategory: "transportation",
          activityType: "local_ride",
          label: "Trip to friend's home",
          timeSlot: "afternoon_activity",
          details: { mode: "car", destination: "friend_home", tripPurpose: "personal" },
          confidence: 0.9,
          status: "confirmed",
        },
      ],
      missingFields: ["distanceKm"],
      followUpQuestion: "How far was the trip?",
      quickReplies: ["About 5 km", "About 10 km"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I went to my friends home in my car at 4:30 PM",
      usedMistral: true,
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "About 10 km",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.assistantMessage).toContain("Logged Trip to friend's home");
    expect(result.assistantMessage).toContain("Anything else");
    expect(result.day?.activities[0].eventTime).toBe("16:30");
    expect(result.day?.activities[0].checkpointId).toBe("17");
    expect(result.day?.activities[0].details.distanceKm).toBe(10);
  });

  it("reconstructs a flight stub when AI asks follow-up without extractedActivities", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "morning_commute",
      detectedTime: "09:00",
      assistantMessage: "Great! Could you confirm the departure city for this trip?",
      extractedActivities: [],
      missingFields: ["departure city"],
      followUpQuestion: "Could you confirm the departure city for this trip?",
      quickReplies: ["Bangalore", "Delhi", "Mumbai"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I took a flight to Dubai for my business trip",
      usedGemini: true,
    };

    const enriched = applyCompletenessToParse(pending, demoGuestProfile);
    expect(enriched.extractedActivities).toHaveLength(1);
    expect(enriched.extractedActivities[0].details.destination).toBe("Dubai");

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      enriched,
      "Bangalore",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day?.activities).toHaveLength(1);
    expect(result.day?.activities[0].details.origin).toBe("Bangalore");
    expect(result.day?.activities[0].details.distanceKm).toBeGreaterThan(2500);
    expect(result.day?.activities[0].estimates.co2eKg).toBeGreaterThan(400);
  });

  it("reconstructs a party stub when AI asks follow-up without extractedActivities", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "17:00",
      assistantMessage: "Did any guests travel to the party?",
      extractedActivities: [],
      missingFields: ["guestTravel"],
      followUpQuestion: "Did you or any guests travel to the party by any mode of transport?",
      quickReplies: ["No travel", "Some guests traveled"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I had a birthday party at 5 PM with 50 guests",
      usedGemini: true,
    };

    const enriched = ensurePendingActivities(pending, demoGuestProfile);
    expect(enriched.extractedActivities).toHaveLength(1);
    expect(enriched.extractedActivities[0].primaryCategory).toBe("social_leisure");
    expect(enriched.extractedActivities[0].details.guestCount).toBe(50);
  });

  it("logs a home birthday party after transport and venue follow-ups", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "17:00",
      assistantMessage: "Did any guests travel to the party?",
      extractedActivities: [],
      missingFields: ["guestTravel"],
      followUpQuestion: "Did you or any guests travel to the party by any mode of transport?",
      quickReplies: ["No travel", "Some guests traveled"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I had a birthday party at 5 PM with 50 guests",
      usedGemini: true,
    };

    const afterTransportReply = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "no it was at home",
      [],
    );

    expect(afterTransportReply.saved).toBe(true);
    expect(afterTransportReply.day?.activities).toHaveLength(1);
    expect(afterTransportReply.day?.activities[0].details.venue).toBe("home");
    expect(afterTransportReply.day?.activities[0].details.guestTravel).toBe("none");
    expect(afterTransportReply.day?.activities[0].label.toLowerCase()).toContain("birthday");
  });

  it("accepts At home chip replies for party follow-ups", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "afternoon_activity",
      detectedTime: "17:00",
      assistantMessage: "Where did the event take place?",
      extractedActivities: [],
      missingFields: ["venue"],
      followUpQuestion: "Where did the birthday party take place?",
      quickReplies: ["At home", "Elsewhere"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I had a birthday party at 5 PM with 50 guests",
      usedGemini: true,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "At home",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day?.activities[0].details.venue).toBe("home");
  });

  it("estimates non-zero CO₂ for a home lunch party with 20 people", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "dinner",
      detectedTime: "20:00",
      assistantMessage: "Was the food home-cooked or ordered from a restaurant?",
      extractedActivities: [],
      missingFields: ["mealSource"],
      followUpQuestion: "Was the food home-cooked or ordered from a restaurant?",
      quickReplies: ["Home cooked", "Restaurant", "Ordered online"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "We had a lunch party at 8 PM with 20 people",
      usedGemini: true,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "At home",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day?.activities[0].details.guestCount).toBe(20);
    expect(result.day?.activities[0].details.mealSource).toBe("home_cooked");
    expect(result.day?.activities[0].estimates.co2eKg).toBeGreaterThan(15);
  });

  it("merges laptop replies using the full conversation text", () => {
    const pending: PandaParseResult = {
      detectedIntent: "live_log",
      detectedSlotId: "work_study",
      detectedTime: "09:00",
      assistantMessage: "Did you use any devices for work?",
      extractedActivities: [
        {
          category: "energy",
          primaryCategory: "work_study",
          activityType: "work_from_home",
          label: "Worked from home",
          timeSlot: "work_study",
          details: { workMode: "work_from_home", subcategory: "work_from_home" },
          confidence: 0.9,
          status: "confirmed",
        },
      ],
      missingFields: ["subcategory"],
      followUpQuestion: "Did you use your laptop for work or personal use?",
      quickReplies: ["Work", "Personal"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "I worked from home and did not travel to office.",
      conversationReplies: ["used my laptop"],
      usedGemini: true,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "laptop",
      [],
    );

    expect(result.saved).toBe(true);
    const activity = result.day?.activities.find((item) => item.details.subcategory === "laptop_use");
    expect(activity).toBeTruthy();
    expect(activity?.details.durationHours).toBeGreaterThan(0);
  });
});
