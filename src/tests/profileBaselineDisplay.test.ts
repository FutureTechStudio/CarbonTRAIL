import { describe, expect, it } from "vitest";
import {
  countSavedBaselineFields,
  formatBaselineFieldValue,
} from "@/features/profile/profileBaselineDisplay";
import { BASELINE_FIELDS } from "@/theme/palette";
import type { ProfileCore } from "@/types";

describe("profileBaselineDisplay", () => {
  it("formats all baseline setup fields from saved guest profile", () => {
    const core: ProfileCore = {
      homeRegion: "Large urban city · Bengaluru",
      householdSize: 2,
      usualWorkMode: "hybrid",
      usualCommuteMode: "scooter",
      usualCommuteDistanceKm: 14,
      dietPattern: "mixed",
      monthlyElectricityKwh: 250,
      foodDeliveryFrequency: "weekly_1_2",
    };

    expect(BASELINE_FIELDS.map((field) => formatBaselineFieldValue(field, core))).toEqual([
      "Large urban city · Bengaluru",
      "2 people",
      "Hybrid",
      "Scooter",
      "5–15 km",
      "Mixed",
      "200–400 units",
      "1–2 times a week",
    ]);
    expect(countSavedBaselineFields(core)).toBe(8);
  });
});
