import { describe, expect, it } from "vitest";
import {
  buildCarbonTrailSeries,
  dayCarbonLevelStyle,
  eventCarbonValue,
  getCarbonBarGeometry,
  getCarbonGraphYRange,
  getDayCarbonLevel,
  groupCarbonTrailByHour,
  sumDayCarbonKg,
} from "@/features/today/carbonTrailGraph";
import type { ActivityEntry } from "@/types";

function mockActivity(partial: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: partial.id ?? "a-1",
    dayId: "d-1",
    category: "transport",
    activityType: "commute_outbound",
    label: "Morning Commute",
    status: "confirmed",
    source: "free_text",
    details: {},
    estimates: {
      co2eKg: 1.2,
      baselineCo2eKg: 1.5,
      savedCo2eKg: 0.3,
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

describe("carbonTrailGraph", () => {
  it("uses each event co2e only, not a running total", () => {
    expect(eventCarbonValue(mockActivity({ estimates: { co2eKg: 1.2, baselineCo2eKg: 1.5, savedCo2eKg: 0.3, impactScore: 1, confidence: 0.8, factorRefs: [] } }))).toBe(1.2);
  });

  it("builds independent values per stop", () => {
    const series = buildCarbonTrailSeries([
      mockActivity({
        id: "a-1",
        label: "Morning Commute",
        details: { timeSlot: "morning_commute" },
        estimates: { co2eKg: 2, baselineCo2eKg: 2, savedCo2eKg: 0, impactScore: 2, confidence: 0.8, factorRefs: [] },
      }),
      mockActivity({
        id: "a-2",
        label: "Lunch",
        category: "food",
        activityType: "lunch",
        details: { timeSlot: "lunch" },
        estimates: { co2eKg: 0.4, baselineCo2eKg: 1, savedCo2eKg: 0.6, impactScore: 1, confidence: 0.8, factorRefs: [] },
      }),
    ]);

    expect(series).toHaveLength(2);
    expect(series[0].valueKg).toBeCloseTo(2);
    expect(series[1].valueKg).toBeCloseTo(0.4);
    expect(series[1].valueKg).toBeLessThan(series[0].valueKg);
  });

  it("anchors y range at zero", () => {
    const range = getCarbonGraphYRange([
      {
        activityId: "a",
        label: "x",
        x: 100,
        valueKg: 1.2,
        estimated: false,
        hour: 12,
        minute: 0,
        timeLabel: "12 PM",
        detailLine: "Office",
        emoji: "🏠",
        status: "confirmed",
      },
    ]);
    expect(range.min).toBe(0);
    expect(range.max).toBeGreaterThanOrEqual(1.2);
  });

  it("builds bar geometry from baseline upward", () => {
    const point = {
      activityId: "a",
      label: "Commute",
      x: 200,
      valueKg: 1.5,
      estimated: false,
      hour: 8,
      minute: 30,
      timeLabel: "8:30 AM",
      detailLine: "Walk · 2 km",
      emoji: "🚶",
      status: "confirmed" as const,
    };
    const bar = getCarbonBarGeometry(point, 0, 2);
    expect(bar.height).toBeGreaterThan(0);
    expect(bar.y).toBeLessThan(bar.baselineY);
  });

  it("groups events by hour with sorted detail rows", () => {
    const series = buildCarbonTrailSeries([
      mockActivity({
        id: "a-1",
        label: "Morning Commute",
        details: { timeSlot: "morning_commute" },
        estimates: { co2eKg: 2, baselineCo2eKg: 2, savedCo2eKg: 0, impactScore: 2, confidence: 0.8, factorRefs: [] },
      }),
      mockActivity({
        id: "a-2",
        label: "Breakfast",
        category: "food",
        activityType: "breakfast",
        details: { timeSlot: "breakfast" },
        estimates: { co2eKg: 0.2, baselineCo2eKg: 0.5, savedCo2eKg: 0.3, impactScore: 1, confidence: 0.8, factorRefs: [] },
      }),
      mockActivity({
        id: "a-3",
        label: "Lunch",
        category: "food",
        activityType: "lunch",
        details: { timeSlot: "lunch" },
        estimates: { co2eKg: 0.4, baselineCo2eKg: 1, savedCo2eKg: 0.6, impactScore: 1, confidence: 0.8, factorRefs: [] },
      }),
    ]);

    const groups = groupCarbonTrailByHour(series);
    expect(groups).toHaveLength(2);
    expect(groups[0].hour).toBe(8);
    expect(groups[0].events).toHaveLength(2);
    expect(groups[0].events[0].label).toBe("Breakfast");
    expect(groups[0].events[1].label).toBe("Morning Commute");
    expect(groups[0].totalKg).toBeCloseTo(2.2);
    expect(groups[1].hour).toBe(13);
    expect(groups[1].events[0].detailLine.length).toBeGreaterThan(0);
  });

  it("colors daily total by low, medium, and high ranges", () => {
    expect(getDayCarbonLevel(3.2)).toBe("low");
    expect(dayCarbonLevelStyle("low").background).toBe("#e6f6ed");

    expect(getDayCarbonLevel(5.5)).toBe("medium");
    expect(dayCarbonLevelStyle("medium").background).toBe("#fff3e3");

    expect(getDayCarbonLevel(8.1)).toBe("high");
    expect(dayCarbonLevelStyle("high").background).toBe("#fdecea");
  });

  it("sums event values into a day total", () => {
    const series = buildCarbonTrailSeries([
      mockActivity({
        id: "a-1",
        estimates: { co2eKg: 2, baselineCo2eKg: 2, savedCo2eKg: 0, impactScore: 2, confidence: 0.8, factorRefs: [] },
      }),
      mockActivity({
        id: "a-2",
        estimates: { co2eKg: 1.3, baselineCo2eKg: 1.3, savedCo2eKg: 0, impactScore: 1, confidence: 0.8, factorRefs: [] },
      }),
    ]);

    expect(sumDayCarbonKg(series)).toBeCloseTo(3.3);
  });
});
