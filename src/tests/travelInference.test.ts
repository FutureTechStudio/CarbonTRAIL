import { describe, expect, it } from "vitest";
import {
  inferFlightRouteFromContext,
  inferTravelDetailsFromText,
  isCommuteDistanceForFlight,
  parseKnownCityFromText,
} from "@/logic/travelInference";
import { applyFollowUpReplyToPendingParse } from "@/ai/pandaDayActions";
import { demoGuestProfile } from "@/data/demoProfile";
import type { PandaParseResult } from "@/ai/pandaSchemas";

describe("travelInference", () => {
  it("infers destination from flight-to phrasing", () => {
    const route = inferFlightRouteFromContext("Took a flight to Dubai for official meetings");
    expect(route.destination).toBe("Dubai");
    expect(route.origin).toBeUndefined();
    expect(route.distanceKm).toBeUndefined();
  });

  it("computes Bangalore to Dubai distance when both cities are known", () => {
    const route = inferFlightRouteFromContext(
      { origin: "Bangalore", destination: "Dubai", mode: "flight" },
      "Flight to Dubai for official meetings",
    );
    expect(route.origin).toBe("Bangalore");
    expect(route.destination).toBe("Dubai");
    expect(route.distanceKm).toBeGreaterThan(2500);
  });

  it("parses from-to routes in free text", () => {
    const details = inferTravelDetailsFromText("I will take a flight to London from Delhi at 11:30 AM");
    expect(details.mode).toBe("flight");
    expect(details.origin).toBe("Delhi");
    expect(details.destination).toBe("London");
    expect(details.distanceKm).toBeGreaterThan(6000);
  });

  it("recognizes common city aliases", () => {
    expect(parseKnownCityFromText("Bengaluru")?.label).toBe("Bangalore");
  });

  it("flags commute-scale distances as invalid for flights", () => {
    expect(isCommuteDistanceForFlight(4)).toBe(true);
    expect(isCommuteDistanceForFlight(2695)).toBe(false);
  });
});

describe("flight follow-up logging", () => {
  it("uses origin follow-up instead of commute distance for Dubai flights", () => {
    const pending: PandaParseResult = {
      detectedIntent: "backfill",
      detectedSlotId: "morning_commute",
      detectedTime: "09:00",
      assistantMessage: "That’s a long-haul flight! Which city are you flying from?",
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
      followUpQuestion: "Which city are you flying from?",
      quickReplies: ["Bangalore", "Delhi", "Mumbai"],
      suggestedProfileUpdate: null,
      confidence: 0.9,
      originalText: "Took a flight to Dubai, for official meetings. around 9 AM",
      usedGemini: false,
    };

    const result = applyFollowUpReplyToPendingParse(
      undefined,
      demoGuestProfile,
      "2025-06-22",
      pending,
      "Bangalore",
      [],
    );

    expect(result.saved).toBe(true);
    expect(result.day!.activities).toHaveLength(1);
    expect(result.day!.activities[0].details.origin).toBe("Bangalore");
    expect(result.day!.activities[0].details.destination).toBe("Dubai");
    expect(result.day!.activities[0].details.distanceKm).toBeGreaterThan(2500);
    expect(result.day!.activities[0].estimates.co2eKg).toBeGreaterThan(400);
  });
});
