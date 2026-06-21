import { describe, expect, it } from "vitest";
import { computeGreenImpact, formatGreenImpactMessage } from "@/logic/greenImpact";

describe("greenImpact", () => {
  it("returns neutral impact because savings logic is disabled", () => {
    const lower = computeGreenImpact(5, 4.1);
    expect(lower.greenImpactKg).toBe(0);
    expect(lower.percentChange).toBe(0);
    expect(lower.isSavings).toBe(false);
    expect(formatGreenImpactMessage(lower)).toContain("matched");

    const higher = computeGreenImpact(3, 4.2);
    expect(higher.greenImpactKg).toBe(0);
    expect(higher.percentChange).toBe(0);
    expect(higher.isSavings).toBe(false);
  });
});
