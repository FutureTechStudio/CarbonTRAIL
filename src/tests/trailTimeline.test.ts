import { describe, expect, it } from "vitest";
import {
  activityToTime,
  getDayNightBands,
  isNightHour,
  slotToTime,
  timeToTimelineX,
} from "@/features/today/trailTimeline";
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

describe("trailTimeline", () => {
  it("maps midnight and noon across the timeline width", () => {
    expect(timeToTimelineX(0, 0)).toBeLessThan(timeToTimelineX(12, 0));
    expect(timeToTimelineX(12, 0)).toBeLessThan(timeToTimelineX(23, 59));
  });

  it("marks night hours outside 6am–6pm", () => {
    expect(isNightHour(5)).toBe(true);
    expect(isNightHour(10)).toBe(false);
    expect(isNightHour(20)).toBe(true);
  });

  it("creates three day/night bands for the 24h strip", () => {
    const bands = getDayNightBands();
    expect(bands).toHaveLength(3);
    expect(bands.map((b) => b.kind)).toEqual(["night", "day", "night"]);
  });

  it("reads logged time from activity details", () => {
    const activity = mockActivity({ details: { loggedTime: "08:30" } });
    expect(activityToTime(activity)).toEqual({ hour: 8, minute: 30 });
  });

  it("falls back to slot defaults", () => {
    expect(slotToTime("dinner")).toEqual({ hour: 20, minute: 0 });
  });
});
