import { describe, expect, it } from "vitest";
import {
  aggregateHistoryForMonth,
  aggregateHistoryForWeek,
  aggregateHistoryForYear,
  aggregateHistoryForYearPeriod,
  buildDaySnapshot,
  getDaysInWeek,
  hasAnyHistory,
} from "@/features/history/historyModel";
import type { GuestState } from "@/storage/types";
import type { ActivityDay, ActivityEntry } from "@/types";

function mockActivity(partial: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: partial.id ?? "a-1",
    dayId: partial.dayId ?? "d-1",
    category: partial.category ?? "transport",
    activityType: partial.activityType ?? "commute_outbound",
    label: partial.label ?? "Morning Commute",
    status: partial.status ?? "confirmed",
    source: "free_text",
    details: partial.details ?? {},
    estimates: {
      co2eKg: 1,
      baselineCo2eKg: 2,
      savedCo2eKg: 0,
      impactScore: 5,
      confidence: 0.8,
      factorRefs: [],
    },
    visualEffect: { nodeType: "road", smoke: "none", greenery: "none", style: "solid" },
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

function makeDay(date: string, kg: number, category: "transportation" | "food_meals" = "transportation"): ActivityDay {
  return {
    id: date,
    profileId: "guest",
    date,
    dayType: "weekday_office",
    status: "confirmed",
    activities: [
      mockActivity({
        id: `${date}-1`,
        dayId: date,
        primaryCategory: category,
        estimates: {
          co2eKg: kg,
          baselineCo2eKg: kg + 1,
          savedCo2eKg: 0,
          impactScore: 5,
          confidence: 0.9,
          factorRefs: [],
        },
        categoryScore: 5,
      }),
    ],
    totals: {
      createdCo2eKg: kg,
      savedCo2eKg: 0,
      netChangeCo2eKg: kg,
      impactScore: 5,
      confidence: 0.9,
      dataCompleteness: 0.82,
    },
    visualSummary: {
      trailCondition: "light",
      smokePatches: 0,
      greenPatches: 0,
      treesGrown: 0,
      estimatedNodes: 1,
    },
    createdAt: "",
    updatedAt: "",
  };
}

const baseState: GuestState = {
  version: 1,
  days: {
    "2026-06-17": makeDay("2026-06-17", 3.2),
    "2026-06-18": makeDay("2026-06-18", 5.1, "food_meals"),
  },
  leafPointEvents: [],
  baselineComplete: true,
  behaviorPatterns: [],
};

describe("historyModel", () => {
  it("builds week snapshots for seven days", () => {
    const keys = getDaysInWeek(new Date("2026-06-21T12:00:00"));
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-06-15");
    expect(keys[6]).toBe("2026-06-21");
  });

  it("aggregates week totals and category breakdown", () => {
    const summary = aggregateHistoryForWeek(baseState, new Date("2026-06-18T12:00:00"));
    expect(summary.trackedDayCount).toBe(2);
    expect(summary.totalCreatedKg).toBeCloseTo(8.3, 1);
    expect(summary.categoryBreakdown.length).toBeGreaterThan(0);
    expect(summary.bestDay?.date).toBe("2026-06-17");
    expect(summary.highestDay?.date).toBe("2026-06-18");
  });

  it("aggregates month and year summaries", () => {
    const month = aggregateHistoryForMonth(baseState, new Date("2026-06-15T12:00:00"));
    expect(month.trackedDayCount).toBe(2);
    expect(month.totalDaysInPeriod).toBe(30);

    const yearPeriod = aggregateHistoryForYearPeriod(baseState, 2026);
    expect(yearPeriod.view).toBe("year");
    expect(yearPeriod.totalCreatedKg).toBeCloseTo(8.3, 1);

    const year = aggregateHistoryForYear(baseState, 2026);
    expect(year.trackedDayCount).toBe(2);
    expect(year.months[5]?.trackedDays).toBe(2);
  });

  it("detects history presence and empty snapshots", () => {
    expect(hasAnyHistory(baseState)).toBe(true);
    const empty = buildDaySnapshot("2026-06-20", undefined);
    expect(empty.tracked).toBe(false);
    expect(empty.intensity).toBe("empty");
  });
});
