import { getAiParseUrl, getAiProvider, isRemoteAiEnabled } from "@/config/aiConfig";
import type { HistoryPeriodSummary, HistoryView, HistoryYearSummary } from "@/features/history/historyModel";
import { parseDateKey } from "@/features/history/historyModel";
import type { UserProfile } from "@/types";
import { extractJsonFromAiText } from "./pandaResponseNormalizer";

export type HistoryPandaAnalysisResult = {
  insights: string[];
  source: "ai" | "local";
  fallbackReason?: string;
};

function formatDayLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("en-US", { weekday: "long" });
}

export function buildHistoryAnalysisPayload(
  summary: HistoryPeriodSummary,
  view: HistoryView,
  yearSummary?: HistoryYearSummary | null,
) {
  return {
    view,
    rangeLabel: summary.rangeLabel,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    totals: {
      createdKg: summary.totalCreatedKg,
      greenImpactKg: summary.greenImpactKg,
      averageCompleteness: summary.averageCompleteness,
      trackedDays: summary.trackedDayCount,
      totalDays: summary.totalDaysInPeriod,
      confirmedEvents: summary.confirmedCount,
      predictedEvents: summary.predictedCount,
    },
    categories: summary.categoryBreakdown.map((row) => ({
      label: row.label,
      totalKg: row.totalKg,
      percent: row.percent,
      averageScore: row.averageScore,
    })),
    dailySnapshots: summary.daySnapshots
      .filter((day) => day.tracked)
      .map((day) => ({
        date: day.date,
        weekday: day.weekday,
        totalKg: day.totalKg,
        savedKg: day.savedKg,
        completeness: day.completeness,
        dominantCategory: day.dominantCategoryLabel,
        intensity: day.intensity,
      })),
    highlights: {
      bestDay: summary.bestDay
        ? { date: summary.bestDay.date, totalKg: summary.bestDay.totalKg }
        : null,
      highestDay: summary.highestDay
        ? { date: summary.highestDay.date, totalKg: summary.highestDay.totalKg }
        : null,
      mostImprovedDay: summary.mostImprovedDay
        ? { date: summary.mostImprovedDay.date, savedKg: summary.mostImprovedDay.savedKg }
        : null,
      weekdayAverageKg: summary.weekdayAverageKg,
      weekendAverageKg: summary.weekendAverageKg,
    },
    yearSummary: yearSummary
      ? {
          year: yearSummary.year,
          yearlyTotalKg: yearSummary.yearlyTotalKg,
          yearlyAverageDailyKg: yearSummary.yearlyAverageDailyKg,
          yearlyGreenImpactKg: yearSummary.yearlyGreenImpactKg,
          trackedDayCount: yearSummary.trackedDayCount,
          bestMonth: yearSummary.bestMonth?.monthLabel ?? null,
          highestMonth: yearSummary.highestMonth?.monthLabel ?? null,
          mostConsistentMonth: yearSummary.mostConsistentMonth?.monthLabel ?? null,
        }
      : null,
    profileSummary: null as string | null,
  };
}

export function buildLocalHistoryAnalysis(
  summary: HistoryPeriodSummary,
  view: HistoryView,
  yearSummary?: HistoryYearSummary | null,
): string[] {
  const periodLabel = view === "week" ? "this week" : view === "month" ? "this month" : "this year";
  const insights: string[] = [];
  const topCategory = summary.categoryBreakdown[0];

  if (topCategory) {
    insights.push(
      `${topCategory.label} was your biggest footprint driver ${periodLabel}, accounting for ${topCategory.percent}% of emissions (${topCategory.totalKg.toFixed(1)} kg CO₂).`,
    );
  }

  if (summary.bestDay && summary.highestDay) {
    if (summary.bestDay.date === summary.highestDay.date) {
      insights.push(
        `${formatDayLabel(summary.bestDay.date)} was both your lightest and heaviest logged day at ${summary.bestDay.totalKg.toFixed(1)} kg CO₂ — you may want to add more detail on other days for clearer patterns.`,
      );
    } else {
      insights.push(
        `Your lowest day was ${formatDayLabel(summary.bestDay.date)} at ${summary.bestDay.totalKg.toFixed(1)} kg CO₂, while ${formatDayLabel(summary.highestDay.date)} peaked at ${summary.highestDay.totalKg.toFixed(1)} kg CO₂.`,
      );
    }
  } else if (summary.bestDay) {
    insights.push(
      `Your lowest day was ${formatDayLabel(summary.bestDay.date)} at ${summary.bestDay.totalKg.toFixed(1)} kg CO₂.`,
    );
  } else if (summary.highestDay) {
    insights.push(
      `${formatDayLabel(summary.highestDay.date)} had your highest footprint at ${summary.highestDay.totalKg.toFixed(1)} kg CO₂.`,
    );
  }

  if (summary.mostImprovedDay) {
    insights.push(
      `${formatDayLabel(summary.mostImprovedDay.date)} looked most improved versus your usual pattern, saving about ${summary.mostImprovedDay.savedKg.toFixed(1)} kg CO₂.`,
    );
  }

  if (summary.greenImpactKg > 0) {
    insights.push(
      `Overall, you saved about ${summary.greenImpactKg.toFixed(1)} kg CO₂ compared with your usual routine ${periodLabel}.`,
    );
  } else if (summary.greenImpactKg < 0) {
    insights.push(
      `Your footprint ran about ${Math.abs(summary.greenImpactKg).toFixed(1)} kg CO₂ above your usual routine ${periodLabel}.`,
    );
  }

  if (summary.weekdayAverageKg > 0 && summary.weekendAverageKg > 0) {
    const weekdayHeavy = summary.weekdayAverageKg > summary.weekendAverageKg;
    insights.push(
      weekdayHeavy
        ? `Weekdays averaged ${summary.weekdayAverageKg.toFixed(1)} kg CO₂ versus ${summary.weekendAverageKg.toFixed(1)} kg on weekends — work and commute patterns likely dominate.`
        : `Weekends averaged ${summary.weekendAverageKg.toFixed(1)} kg CO₂ versus ${summary.weekdayAverageKg.toFixed(1)} kg on weekdays — leisure or travel may be driving more of the difference.`,
    );
  }

  if (view === "year" && yearSummary?.bestMonth && yearSummary.highestMonth) {
    insights.push(
      `${yearSummary.bestMonth.monthLabel} was your lightest month (${yearSummary.bestMonth.totalKg.toFixed(1)} kg CO₂) and ${yearSummary.highestMonth.monthLabel} was the heaviest (${yearSummary.highestMonth.totalKg.toFixed(1)} kg CO₂).`,
    );
  }

  if (summary.trackedDayCount > 0) {
    insights.push(
      `You tracked ${summary.trackedDayCount} of ${summary.totalDaysInPeriod} days (${summary.averageCompleteness}% average completeness). Filling missing checkpoints will sharpen these patterns.`,
    );
  }

  if (insights.length === 0) {
    insights.push("Log a few more daily trails and Panda will be able to explain your history in more detail.");
  }

  return insights.slice(0, 6);
}

function normalizeInsights(raw: unknown): string[] | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const list = Array.isArray(data.insights)
    ? data.insights
    : Array.isArray(data.summary)
      ? data.summary
      : Array.isArray(data.paragraphs)
        ? data.paragraphs
        : null;
  if (!list) return null;
  const insights = list.map(String).map((item) => item.trim()).filter(Boolean);
  return insights.length > 0 ? insights.slice(0, 6) : null;
}

async function analyzeHistoryPeriodRemote(
  payload: ReturnType<typeof buildHistoryAnalysisPayload>,
): Promise<{ insights: string[] | null; error?: string }> {
  const provider = getAiProvider();
  const proxyUrl = getAiParseUrl();
  if (!isRemoteAiEnabled() || !proxyUrl) {
    return { insights: null, error: "Remote AI is not configured." };
  }

  const systemPrompt = `You are Panda AI for CarbonTrail AI.
Explain the user's carbon history for the selected period using ONLY the JSON data provided.
Be concise, friendly, and never shame the user.
Cover the biggest categories, best/lowest day, highest day, weekday vs weekend patterns, green impact, and one actionable observation if data allows.
Return ONLY valid JSON: { "insights": ["sentence 1", "sentence 2", ...] } with 3 to 6 insight strings.`;

  const userPrompt = JSON.stringify(
    {
      task: "Explain this carbon history period.",
      history: payload,
    },
    null,
    2,
  );

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userPrompt, context: {}, systemPrompt, userPrompt }),
    });

    if (!response.ok) {
      let error = `${provider} proxy error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error) error = String(errJson.error);
      } catch {
        /* ignore */
      }
      return { insights: null, error };
    }

    const text = await response.text();
    const parsed = extractJsonFromAiText(text);
    const insights = normalizeInsights(parsed);
    if (!insights) {
      return { insights: null, error: "AI response did not include insights." };
    }
    return { insights };
  } catch (error) {
    return {
      insights: null,
      error: error instanceof Error ? error.message : `${provider} request failed.`,
    };
  }
}

export async function analyzeHistoryPeriod({
  summary,
  view,
  profile,
  yearSummary = null,
}: {
  summary: HistoryPeriodSummary;
  view: HistoryView;
  profile: UserProfile;
  yearSummary?: HistoryYearSummary | null;
}): Promise<HistoryPandaAnalysisResult> {
  const payload = buildHistoryAnalysisPayload(summary, view, yearSummary);
  payload.profileSummary = `Living area: ${profile.core.homeRegion ?? "unknown"}; commute: ${profile.core.usualCommuteMode ?? "unknown"}; work: ${profile.core.usualWorkMode ?? "unknown"}`;

  const remote = await analyzeHistoryPeriodRemote(payload);
  if (remote.insights) {
    return { insights: remote.insights, source: "ai" };
  }

  return {
    insights: buildLocalHistoryAnalysis(summary, view, yearSummary),
    source: "local",
    fallbackReason: remote.error,
  };
}
