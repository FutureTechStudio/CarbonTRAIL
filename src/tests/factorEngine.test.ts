import { describe, expect, it } from "vitest";
import {
  computeActivityEstimates,
  computeDayTotals,
  estimateElectricity,
  estimateFood,
  estimateTransport,
  estimateWaste,
} from "@/logic/factorEngine";
import type { ActivityEntry } from "@/types";

describe("factorEngine", () => {
  it("computes 14km scooter commute", () => {
    const result = estimateTransport({ mode: "scooter", distanceKm: 14 });
    expect(result.co2eKg).toBeCloseTo(1.54, 2);
  });

  it("computes carpool using occupancy rule", () => {
    const result = estimateTransport({ mode: "carpool", distanceKm: 14 });
    expect(result.co2eKg).toBeCloseTo(0.595, 3);
  });

  it("computes ordered chicken meal", () => {
    const result = estimateFood({
      foodType: "chicken_fish",
      mealSource: "ordered_online",
      packaging: "plastic_heavy",
      deliveryType: "foodDelivery",
    });
    expect(result.co2eKg).toBeCloseTo(2.42, 2);
  });

  it("computes walked restaurant meal with chicken/fish", () => {
    const result = estimateFood({
      foodType: "chicken_fish",
      mealSource: "restaurant",
      packaging: "minimal",
    });
    expect(result.co2eKg).toBeCloseTo(1.85, 2);
  });

  it("computes high AC electricity", () => {
    const result = estimateElectricity({
      monthlyKwh: 300,
      extraAcHours: 4,
      baselineExtraAcHours: 0,
    });
    expect(result.co2eKg).toBeCloseTo(1.82, 2);
    expect(result.savedCo2eKg).toBe(0);
  });

  it("computes normal waste", () => {
    const result = estimateWaste({ wasteType: "normalDaily" });
    expect(result.co2eKg).toBeCloseTo(0.2, 3);
  });

  it("uses baseline commute distance when actual distance is missing", () => {
    const result = computeActivityEstimates({
      category: "transport",
      status: "confirmed",
      details: { mode: "scooter", distanceKm: 0, baselineDistanceKm: 4, baselineMode: "scooter" },
    });
    expect(result.co2eKg).toBeCloseTo(0.44, 2);
    expect(result.savedCo2eKg).toBe(0);
  });

  it("recomputes flight distance when a commute distance was stored by mistake", () => {
    const result = computeActivityEstimates({
      category: "transport",
      status: "confirmed",
      details: {
        mode: "flight",
        distanceKm: 4,
        origin: "Bangalore",
        destination: "Dubai",
      },
    });
    expect(result.co2eKg).toBeGreaterThan(400);
  });

  it("computes a home lunch party scaled by headcount", () => {
    const result = computeActivityEstimates({
      category: "special",
      activityType: "party",
      label: "Lunch party",
      status: "confirmed",
      details: {
        specialType: "party",
        subcategory: "party",
        guestCount: 20,
        venue: "home",
        mealSource: "home_cooked",
      },
    });

    expect(result.co2eKg).toBeCloseTo(26.4, 0);
    expect(result.savedCo2eKg).toBe(0);
  });

  it("computes laptop use from digital activities", () => {
    const result = computeActivityEstimates({
      category: "digital",
      activityType: "laptop_use",
      label: "Laptop use while working from home",
      status: "confirmed",
      details: { subcategory: "laptop_use", durationHours: 6 },
    });

    expect(result.co2eKg).toBeCloseTo(0.15, 2);
  });

  it("computes full sample day totals", () => {
    const rawActivities: Pick<ActivityEntry, "category" | "status" | "details" | "estimates">[] = [
      {
        category: "transport",
        status: "confirmed",
        details: { mode: "scooter", distanceKm: 14 },
        estimates: { co2eKg: 0, baselineCo2eKg: 0, savedCo2eKg: 0, impactScore: 0, confidence: 0, factorRefs: [] },
      },
      {
        category: "transport",
        status: "confirmed",
        details: { mode: "carpool", distanceKm: 14, baselineMode: "scooter" },
        estimates: { co2eKg: 0, baselineCo2eKg: 0, savedCo2eKg: 0, impactScore: 0, confidence: 0, factorRefs: [] },
      },
      {
        category: "food",
        status: "confirmed",
        details: { foodType: "chicken_fish", mealSource: "restaurant", packaging: "normal" },
        estimates: { co2eKg: 0, baselineCo2eKg: 0, savedCo2eKg: 0, impactScore: 0, confidence: 0, factorRefs: [] },
      },
      {
        category: "energy",
        status: "confirmed",
        details: { monthlyKwh: 250, extraAcHours: 3, baselineExtraAcHours: 0 },
        estimates: { co2eKg: 0, baselineCo2eKg: 0, savedCo2eKg: 0, impactScore: 0, confidence: 0, factorRefs: [] },
      },
      {
        category: "waste",
        status: "confirmed",
        details: { wasteType: "normalDaily" },
        estimates: { co2eKg: 0, baselineCo2eKg: 0, savedCo2eKg: 0, impactScore: 0, confidence: 0, factorRefs: [] },
      },
    ];

    const activities: Pick<ActivityEntry, "category" | "status" | "details" | "estimates">[] = rawActivities.map((activity) => ({
      ...activity,
      estimates: computeActivityEstimates(activity),
    }));

    const totals = computeDayTotals(activities);
    expect(totals.createdCo2eKg).toBeGreaterThan(4);
    expect(totals.impactScore).toBeGreaterThanOrEqual(5);
    expect(totals.confidence).toBeGreaterThan(0.7);
  });
});
