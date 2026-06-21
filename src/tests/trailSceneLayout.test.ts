import { describe, expect, it } from "vitest";
import {
  activityToScenePoint,
  getMissingJourneySlots,
  getNodeVisualStyle,
  slotToScenePoint,
} from "@/features/today/trailSceneLayout";
import type { ActivityEntry } from "@/types";

function mockActivity(partial: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: "a-1",
    dayId: "d-1",
    category: "transport",
    activityType: "commute_outbound",
    label: "Morning Commute",
    status: "confirmed",
    source: "free_text",
    details: {},
    estimates: {
      co2eKg: 1,
      baselineCo2eKg: 1,
      savedCo2eKg: 0,
      impactScore: 1,
      confidence: 0.8,
      factorRefs: [],
    },
    visualEffect: { nodeType: "road", smoke: "none", greenery: "none", style: "solid" },
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("trailSceneLayout", () => {
  it("places morning at the bottom and evening at the top", () => {
    expect(slotToScenePoint("breakfast").y).toBeGreaterThan(slotToScenePoint("dinner").y);
    expect(slotToScenePoint("morning_commute").y).toBeGreaterThan(slotToScenePoint("evening_commute").y);
  });

  it("places day checkpoints on the left and night checkpoints on the right", () => {
    expect(slotToScenePoint("lunch").x).toBeLessThan(slotToScenePoint("night_energy").x);
    expect(slotToScenePoint("work_study").x).toBeLessThan(slotToScenePoint("waste_final").x);
  });

  it("styles estimated nodes as faded dotted", () => {
    const style = getNodeVisualStyle(mockActivity({ status: "estimated_from_profile" }));
    expect(style.strokeDasharray).toBeDefined();
    expect(style.opacity).toBeLessThan(0.7);
  });

  it("finds missing journey slots from checkpoint statuses", () => {
    const missing = getMissingJourneySlots({ lunch: "missing", dinner: "confirmed" });
    expect(missing).toContain("lunch");
    expect(missing).not.toContain("dinner");
  });

  it("maps activities to scenic stop positions", () => {
    const point = activityToScenePoint(mockActivity({ label: "Morning Commute", category: "transport" }));
    expect(point.x).toBeGreaterThan(40);
    expect(point.y).toBeGreaterThan(500);
  });
});
