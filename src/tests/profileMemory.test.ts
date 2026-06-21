import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import {
  applyProfileFieldUpdate,
  computeProfileConfidence,
  confirmPattern,
  dismissPattern,
} from "@/logic/profileMemory";

describe("profileMemory", () => {
  it("computes profile confidence", () => {
    const confidence = computeProfileConfidence(demoGuestProfile);
    expect(confidence).toBeGreaterThan(0.5);
    expect(confidence).toBeLessThanOrEqual(0.98);
  });

  it("confirms learned pattern", () => {
    const patternId = demoGuestProfile.learnedPatterns[0].id;
    const updated = confirmPattern(demoGuestProfile, patternId);
    const pattern = updated.learnedPatterns.find((item) => item.id === patternId);
    expect(pattern?.status).toBe("confirmed");
  });

  it("dismisses learned pattern", () => {
    const patternId = demoGuestProfile.learnedPatterns[1].id;
    const updated = dismissPattern(demoGuestProfile, patternId);
    const pattern = updated.learnedPatterns.find((item) => item.id === patternId);
    expect(pattern?.status).toBe("dismissed");
  });

  it("applies profile field updates", () => {
    const updated = applyProfileFieldUpdate(demoGuestProfile, "core.usualCommuteDistanceKm", 22);
    expect(updated.core.usualCommuteDistanceKm).toBe(22);
  });
});
