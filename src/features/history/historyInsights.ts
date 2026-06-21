import type { HistoryPeriodSummary, HistoryView, HistoryYearSummary } from "@/features/history/historyModel";
import { formatDateKey, parseDateKey } from "@/features/history/historyModel";

export type HistoryInsight = {
  id: string;
  text: string;
};

export type HistoryPatternCard = {
  id: string;
  title: string;
  value: string;
  helper: string;
};

function formatDayLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("en-US", { weekday: "long" });
}

export function buildHistoryInsights(
  summary: HistoryPeriodSummary,
  view: HistoryView,
): HistoryInsight[] {
  const insights: HistoryInsight[] = [];
  const periodLabel = view === "week" ? "this week" : view === "month" ? "this month" : "this year";
  const topCategory = summary.categoryBreakdown[0];

  if (topCategory) {
    insights.push({
      id: "top-category",
      text: `Your ${topCategory.label.toLowerCase()} created the largest share ${periodLabel} (${topCategory.percent}%).`,
    });
  }

  if (summary.bestDay) {
    insights.push({
      id: "best-day",
      text: `Your lowest day was ${formatDayLabel(summary.bestDay.date)} with ${summary.bestDay.totalKg.toFixed(1)} kg CO₂.`,
    });
  }

  if (summary.highestDay && summary.highestDay.date !== summary.bestDay?.date) {
    insights.push({
      id: "high-day",
      text: `${formatDayLabel(summary.highestDay.date)} had your highest footprint at ${summary.highestDay.totalKg.toFixed(1)} kg CO₂.`,
    });
  }

  if (summary.greenImpactKg > 0) {
    insights.push({
      id: "green-impact",
      text: `You saved about ${summary.greenImpactKg.toFixed(1)} kg CO₂ compared with your usual routine ${periodLabel}.`,
    });
  } else if (summary.greenImpactKg < 0) {
    insights.push({
      id: "green-impact-negative",
      text: `Your footprint was ${Math.abs(summary.greenImpactKg).toFixed(1)} kg CO₂ above your usual routine ${periodLabel}.`,
    });
  }

  if (summary.weekdayAverageKg > 0 && summary.weekendAverageKg > 0) {
    insights.push({
      id: "weekday-weekend",
      text: `Weekday average was ${summary.weekdayAverageKg.toFixed(1)} kg CO₂ and weekend average was ${summary.weekendAverageKg.toFixed(1)} kg CO₂.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "empty",
      text: "Complete a few daily trails and Panda will start spotting patterns in your history.",
    });
  }

  return insights.slice(0, 4);
}

export function buildHistoryPatternCards(summary: HistoryPeriodSummary): HistoryPatternCard[] {
  const topCategory = summary.categoryBreakdown[0];
  return [
    {
      id: "impactful-category",
      title: "Most Impactful Category",
      value: topCategory?.label ?? "Not enough data",
      helper: topCategory ? `${topCategory.percent}% of this period` : "Log more activities to see this",
    },
    {
      id: "best-day",
      title: "Best Low-Carbon Day",
      value: summary.bestDay ? `${summary.bestDay.totalKg.toFixed(1)} kg CO₂` : "No data yet",
      helper: summary.bestDay ? formatDayLabel(summary.bestDay.date) : "Track a few days first",
    },
    {
      id: "improved-day",
      title: "Most Improved Day",
      value: summary.mostImprovedDay ? `${summary.mostImprovedDay.savedKg.toFixed(1)} kg saved` : "No data yet",
      helper: summary.mostImprovedDay ? formatDayLabel(summary.mostImprovedDay.date) : "Compared with your usual pattern",
    },
    {
      id: "highest-day",
      title: "Highest Footprint Day",
      value: summary.highestDay ? `${summary.highestDay.totalKg.toFixed(1)} kg CO₂` : "No data yet",
      helper: summary.highestDay ? formatDayLabel(summary.highestDay.date) : "Track a few days first",
    },
  ];
}

export function buildPandaHistoryPrompt(view: HistoryView, rangeLabel: string): string {
  const period = view === "week" ? "week" : view === "month" ? "month" : "year";
  return `Explain my carbon history for this ${period} (${rangeLabel}). Highlight my biggest categories, best day, highest day, and any patterns Panda notices.`;
}

export function buildYearInsights(yearSummary: HistoryYearSummary): HistoryInsight[] {
  const insights: HistoryInsight[] = [];

  if (yearSummary.bestMonth) {
    insights.push({
      id: "best-month",
      text: `${yearSummary.bestMonth.monthLabel} was your lightest month at ${yearSummary.bestMonth.totalKg.toFixed(1)} kg CO₂.`,
    });
  }

  if (yearSummary.highestMonth) {
    insights.push({
      id: "high-month",
      text: `${yearSummary.highestMonth.monthLabel} had the highest footprint (${yearSummary.highestMonth.totalKg.toFixed(1)} kg CO₂).`,
    });
  }

  if (yearSummary.mostConsistentMonth) {
    insights.push({
      id: "consistent-month",
      text: `${yearSummary.mostConsistentMonth.monthLabel} was your most consistent month with ${yearSummary.mostConsistentMonth.trackedDays} days tracked.`,
    });
  }

  if (yearSummary.yearlyGreenImpactKg > 0) {
    insights.push({
      id: "year-green",
      text: `Across ${yearSummary.year}, you saved about ${yearSummary.yearlyGreenImpactKg.toFixed(1)} kg CO₂ compared with your usual routine.`,
    });
  }

  return insights.length > 0
    ? insights
    : [{ id: "empty", text: "Your yearly story will appear here once more days are logged." }];
}

export function todayDateKey(): string {
  return formatDateKey(new Date());
}
