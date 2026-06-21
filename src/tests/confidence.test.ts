import { describe, expect, it } from "vitest";
import { activityConfidenceByStatus, clamp, computeDayConfidence } from "@/logic/confidence";

describe("confidence", () => {
  it("maps confidence by data status", () => {
    expect(activityConfidenceByStatus("confirmed")).toBe(0.9);
    expect(activityConfidenceByStatus("parsed_pending")).toBe(0.75);
    expect(activityConfidenceByStatus("estimated_from_profile")).toBe(0.55);
  });

  it("computes day confidence with formula and clamp", () => {
    const score = computeDayConfidence(
      [
        { status: "confirmed" },
        { status: "confirmed" },
        { status: "parsed_pending" },
        { status: "estimated_from_profile" },
      ],
      0.64,
    );
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(0.98);
  });

  it("clamps values between 0.05 and 0.98", () => {
    expect(clamp(-2)).toBe(0.05);
    expect(clamp(2)).toBe(0.98);
  });
});
