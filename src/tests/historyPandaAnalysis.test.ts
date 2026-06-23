import { describe, expect, it } from "vitest";
import { buildLocalHistoryAnalysis } from "@/ai/historyPandaAnalysis";
import type { HistoryPeriodSummary } from "@/features/history/historyModel";

function mockSummary(partial: Partial<HistoryPeriodSummary> = {}): HistoryPeriodSummary {
  return {
    view: "week",
    rangeLabel: "Jun 22 – 28 2026",
    periodStart: "2026-06-22",
    periodEnd: "2026-06-28",
    totalCreatedKg: 18.4,
    greenImpactKg: 2.1,
    averageDailyScore: 4.2,
    averageCompleteness: 72,
    trackedDayCount: 5,
    totalDaysInPeriod: 7,
    daySnapshots: [],
    categoryBreakdown: [
      {
        id: "food_meals",
        label: "Food & Meals",
        icon: "🥣",
        totalKg: 7.2,
        percent: 40,
        averageScore: 5,
      },
    ],
    confirmedCount: 8,
    predictedCount: 2,
    emptyCount: 1,
    weekdayAverageKg: 3.1,
    weekendAverageKg: 2.4,
    bestDay: {
      date: "2026-06-23",
      totalKg: 2.6,
      savedKg: 0.4,
      dailyScore: 3,
      completeness: 80,
      dominantCategory: "food_meals",
      dominantCategoryLabel: "Food & Meals",
      intensity: "low",
      tracked: true,
      weekday: true,
      confirmedCount: 2,
      predictedCount: 0,
    },
    highestDay: {
      date: "2026-06-25",
      totalKg: 4.8,
      savedKg: -0.2,
      dailyScore: 6,
      completeness: 70,
      dominantCategory: "transportation",
      dominantCategoryLabel: "Transportation",
      intensity: "medium",
      tracked: true,
      weekday: true,
      confirmedCount: 2,
      predictedCount: 1,
    },
    ...partial,
  };
}

describe("historyPandaAnalysis", () => {
  it("builds local history insights from period summary", () => {
    const insights = buildLocalHistoryAnalysis(mockSummary(), "week");
    expect(insights.some((line) => line.includes("Food & Meals"))).toBe(true);
    expect(insights.some((line) => line.includes("Tuesday") || line.includes("lowest day"))).toBe(true);
    expect(insights.length).toBeGreaterThan(0);
  });
});
