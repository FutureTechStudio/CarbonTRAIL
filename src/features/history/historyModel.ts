import { isNothingToLogActivity } from "@/features/today/timeCheckpointActions";
import { getActivityPrimaryCategoryLabel } from "@/features/today/todayHelpers";
import { computeGreenImpact } from "@/logic/greenImpact";
import { PRIMARY_CATEGORY_LABELS } from "@/logic/categoryScoring";
import type { GuestState } from "@/storage/types";
import type { ActivityDay, ActivityEntry, PrimaryActionCategory } from "@/types";

export type HistoryView = "week" | "month" | "year";

export type FootprintIntensity = "low" | "medium" | "high" | "incomplete" | "empty";

export type HistoryCategoryGroupId =
  | "transportation"
  | "food_meals"
  | "home_energy"
  | "delivery_shopping"
  | "waste_recycling"
  | "work_study"
  | "digital_devices"
  | "water_hot_water"
  | "other";

export const HISTORY_CATEGORY_GROUPS: Array<{
  id: HistoryCategoryGroupId;
  label: string;
  icon: string;
  categories: PrimaryActionCategory[];
}> = [
  { id: "transportation", label: "Transportation", icon: "🛵", categories: ["transportation", "travel_trips"] },
  { id: "food_meals", label: "Food & Meals", icon: "🥣", categories: ["food_meals", "cooking_energy"] },
  { id: "home_energy", label: "Home Energy", icon: "🏠", categories: ["home_energy"] },
  {
    id: "delivery_shopping",
    label: "Delivery & Shopping",
    icon: "📦",
    categories: ["delivery_online_orders", "shopping_purchases"],
  },
  { id: "waste_recycling", label: "Waste & Recycling", icon: "♻️", categories: ["waste_recycling"] },
  { id: "work_study", label: "Work / Study", icon: "💻", categories: ["work_study"] },
  { id: "digital_devices", label: "Digital & Devices", icon: "💻", categories: ["digital_devices"] },
  { id: "water_hot_water", label: "Water & Hot Water", icon: "🚿", categories: ["water_hot_water"] },
  {
    id: "other",
    label: "Other",
    icon: "🌿",
    categories: ["personal_care", "household_chores", "social_leisure", "positive_avoided_actions", "other_unknown"],
  },
];

export type HistoryDaySnapshot = {
  date: string;
  day?: ActivityDay;
  totalKg: number;
  savedKg: number;
  dailyScore: number;
  completeness: number;
  dominantCategory: HistoryCategoryGroupId | null;
  dominantCategoryLabel: string;
  intensity: FootprintIntensity;
  tracked: boolean;
  weekday: boolean;
  confirmedCount: number;
  predictedCount: number;
};

export type HistoryCategoryRow = {
  id: HistoryCategoryGroupId;
  label: string;
  icon: string;
  totalKg: number;
  percent: number;
  averageScore: number;
};

export type HistoryPeriodSummary = {
  view: HistoryView;
  rangeLabel: string;
  periodStart: string;
  periodEnd: string;
  totalCreatedKg: number;
  greenImpactKg: number;
  averageDailyScore: number;
  averageCompleteness: number;
  trackedDayCount: number;
  totalDaysInPeriod: number;
  daySnapshots: HistoryDaySnapshot[];
  categoryBreakdown: HistoryCategoryRow[];
  confirmedCount: number;
  predictedCount: number;
  emptyCount: number;
  weekdayAverageKg: number;
  weekendAverageKg: number;
  bestDay?: HistoryDaySnapshot;
  highestDay?: HistoryDaySnapshot;
  mostImprovedDay?: HistoryDaySnapshot;
};

export type HistoryMonthSummary = {
  monthIndex: number;
  monthLabel: string;
  totalKg: number;
  trackedDays: number;
  topCategoryLabel: string;
  greenImpactKg: number;
  averageDailyKg: number;
  trend: "up" | "down" | "flat";
};

export type HistoryYearSummary = {
  year: number;
  months: HistoryMonthSummary[];
  yearlyTotalKg: number;
  yearlyAverageDailyKg: number;
  yearlyGreenImpactKg: number;
  trackedDayCount: number;
  bestMonth?: HistoryMonthSummary;
  highestMonth?: HistoryMonthSummary;
  mostConsistentMonth?: HistoryMonthSummary;
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(12, 0, 0, 0);
  return next;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function getDaysInWeek(anchor: Date): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return formatDateKey(day);
  });
}

export function getDaysInMonth(anchor: Date): string[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDate }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

export function getMonthsInYear(year: number): Date[] {
  return Array.from({ length: 12 }, (_, month) => new Date(year, month, 15, 12, 0, 0, 0));
}

export function formatWeekRangeLabel(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  });
  return `${startLabel} – ${endLabel}${sameMonth ? ` ${start.getFullYear()}` : ""}`;
}

export function formatMonthLabel(anchor: Date): string {
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function activityPrimaryCategory(activity: ActivityEntry): PrimaryActionCategory {
  if (activity.primaryCategory) return activity.primaryCategory;
  if (activity.category === "transport") return "transportation";
  if (activity.category === "food") return "food_meals";
  if (activity.category === "delivery") return "delivery_online_orders";
  if (activity.category === "shopping") return "shopping_purchases";
  if (activity.category === "energy") return "home_energy";
  if (activity.category === "waste") return "waste_recycling";
  if (activity.category === "digital") return "digital_devices";
  return "other_unknown";
}

function mapPrimaryToHistoryGroup(category: PrimaryActionCategory): HistoryCategoryGroupId {
  const match = HISTORY_CATEGORY_GROUPS.find((group) => group.categories.includes(category));
  return match?.id ?? "other";
}

function meaningfulActivities(day: ActivityDay): ActivityEntry[] {
  return day.activities.filter((activity) => !isNothingToLogActivity(activity));
}

function dayBaselineKg(day: ActivityDay): number {
  return meaningfulActivities(day).reduce((sum, activity) => sum + activity.estimates.baselineCo2eKg, 0);
}

function daySavedKg(day: ActivityDay): number {
  const baseline = dayBaselineKg(day);
  return computeGreenImpact(baseline, day.totals.createdCo2eKg).greenImpactKg;
}

function getDailyScore(day: ActivityDay): number {
  const activities = meaningfulActivities(day);
  const scored = activities
    .map((activity) => activity.categoryScore)
    .filter((score): score is number => typeof score === "number");
  if (scored.length > 0) {
    return Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10;
  }
  return day.totals.impactScore;
}

function getDailyCompleteness(day: ActivityDay): number {
  return Math.round((day.totals.dataCompleteness ?? day.totals.confidence ?? 0) * 100);
}

function getFootprintIntensity(day: ActivityDay | undefined, totalKg: number): FootprintIntensity {
  if (!day || meaningfulActivities(day).length === 0) return "empty";
  const completeness = getDailyCompleteness(day);
  const estimatedShare =
    meaningfulActivities(day).filter((activity) => activity.status === "estimated_from_profile").length /
    Math.max(meaningfulActivities(day).length, 1);
  if (completeness < 45 || estimatedShare > 0.6 || day.status === "auto_filled") return "incomplete";
  if (day.totals.impactScore <= 3 || totalKg <= 2.5) return "low";
  if (day.totals.impactScore <= 6 || totalKg <= 5) return "medium";
  return "high";
}

function getDominantCategory(day: ActivityDay): { id: HistoryCategoryGroupId; label: string } {
  const totals = new Map<HistoryCategoryGroupId, number>();
  for (const activity of meaningfulActivities(day)) {
    const groupId = mapPrimaryToHistoryGroup(activityPrimaryCategory(activity));
    totals.set(groupId, (totals.get(groupId) ?? 0) + activity.estimates.co2eKg);
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return { id: "other", label: "Other" };
  const group = HISTORY_CATEGORY_GROUPS.find((item) => item.id === top[0]);
  return { id: top[0], label: group?.label ?? "Other" };
}

function countActivityStatuses(day: ActivityDay): { confirmed: number; predicted: number } {
  const activities = meaningfulActivities(day);
  return {
    confirmed: activities.filter((activity) => activity.status === "confirmed").length,
    predicted: activities.filter(
      (activity) =>
        activity.status === "assumed" ||
        activity.status === "parsed_pending" ||
        activity.status === "estimated_from_profile",
    ).length,
  };
}

export function buildDaySnapshot(dateKey: string, day: ActivityDay | undefined): HistoryDaySnapshot {
  const weekday = parseDateKey(dateKey).getDay();
  if (!day) {
    return {
      date: dateKey,
      totalKg: 0,
      savedKg: 0,
      dailyScore: 0,
      completeness: 0,
      dominantCategory: null,
      dominantCategoryLabel: "No data",
      intensity: "empty",
      tracked: false,
      weekday: weekday !== 0 && weekday !== 6,
      confirmedCount: 0,
      predictedCount: 0,
    };
  }

  const dominant = getDominantCategory(day);
  const statuses = countActivityStatuses(day);

  return {
    date: dateKey,
    day,
    totalKg: day.totals.createdCo2eKg,
    savedKg: daySavedKg(day),
    dailyScore: getDailyScore(day),
    completeness: getDailyCompleteness(day),
    dominantCategory: dominant.id,
    dominantCategoryLabel: dominant.label,
    intensity: getFootprintIntensity(day, day.totals.createdCo2eKg),
    tracked: meaningfulActivities(day).length > 0,
    weekday: weekday !== 0 && weekday !== 6,
    confirmedCount: statuses.confirmed,
    predictedCount: statuses.predicted,
  };
}

function aggregateCategoryBreakdown(days: ActivityDay[]): HistoryCategoryRow[] {
  const totals = new Map<HistoryCategoryGroupId, { kg: number; scores: number[] }>();

  for (const group of HISTORY_CATEGORY_GROUPS) {
    totals.set(group.id, { kg: 0, scores: [] });
  }

  for (const day of days) {
    for (const activity of meaningfulActivities(day)) {
      const groupId = mapPrimaryToHistoryGroup(activityPrimaryCategory(activity));
      const bucket = totals.get(groupId)!;
      bucket.kg += activity.estimates.co2eKg;
      if (typeof activity.categoryScore === "number") bucket.scores.push(activity.categoryScore);
    }
  }

  const createdTotal = [...totals.values()].reduce((sum, item) => sum + item.kg, 0);

  return HISTORY_CATEGORY_GROUPS.map((group) => {
    const bucket = totals.get(group.id)!;
    const averageScore =
      bucket.scores.length > 0
        ? Math.round((bucket.scores.reduce((sum, score) => sum + score, 0) / bucket.scores.length) * 10) / 10
        : 0;
    return {
      id: group.id,
      label: group.label,
      icon: group.icon,
      totalKg: Math.round(bucket.kg * 10) / 10,
      percent: createdTotal > 0 ? Math.round((bucket.kg / createdTotal) * 100) : 0,
      averageScore,
    };
  })
    .filter((row) => row.totalKg > 0)
    .sort((a, b) => b.totalKg - a.totalKg);
}

function aggregatePeriodSummary(
  view: HistoryView,
  rangeLabel: string,
  periodStart: string,
  periodEnd: string,
  dateKeys: string[],
  daysByKey: Record<string, ActivityDay>,
): HistoryPeriodSummary {
  const daySnapshots = dateKeys.map((dateKey) => buildDaySnapshot(dateKey, daysByKey[dateKey]));
  const trackedDays = daySnapshots.filter((snapshot) => snapshot.tracked);
  const storedDays = trackedDays.map((snapshot) => daysByKey[snapshot.date]!);

  const totalCreatedKg = trackedDays.reduce((sum, snapshot) => sum + snapshot.totalKg, 0);
  const totalBaseline = storedDays.reduce((sum, day) => sum + dayBaselineKg(day), 0);
  const greenImpactKg = computeGreenImpact(totalBaseline, totalCreatedKg).greenImpactKg;

  const weekdayTracked = trackedDays.filter((snapshot) => snapshot.weekday);
  const weekendTracked = trackedDays.filter((snapshot) => !snapshot.weekday);

  const average = (values: number[]) =>
    values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;

  const bestDay = [...trackedDays].sort((a, b) => a.totalKg - b.totalKg)[0];
  const highestDay = [...trackedDays].sort((a, b) => b.totalKg - a.totalKg)[0];
  const mostImprovedDay = [...trackedDays].sort((a, b) => b.savedKg - a.savedKg)[0];

  return {
    view,
    rangeLabel,
    periodStart,
    periodEnd,
    totalCreatedKg: Math.round(totalCreatedKg * 10) / 10,
    greenImpactKg: Math.round(greenImpactKg * 10) / 10,
    averageDailyScore: average(trackedDays.map((snapshot) => snapshot.dailyScore)),
    averageCompleteness: Math.round(average(trackedDays.map((snapshot) => snapshot.completeness))),
    trackedDayCount: trackedDays.length,
    totalDaysInPeriod: dateKeys.length,
    daySnapshots,
    categoryBreakdown: aggregateCategoryBreakdown(storedDays),
    confirmedCount: trackedDays.reduce((sum, snapshot) => sum + snapshot.confirmedCount, 0),
    predictedCount: trackedDays.reduce((sum, snapshot) => sum + snapshot.predictedCount, 0),
    emptyCount: daySnapshots.filter((snapshot) => !snapshot.tracked).length,
    weekdayAverageKg: average(weekdayTracked.map((snapshot) => snapshot.totalKg)),
    weekendAverageKg: average(weekendTracked.map((snapshot) => snapshot.totalKg)),
    bestDay,
    highestDay,
    mostImprovedDay,
  };
}

export function aggregateHistoryForWeek(state: GuestState, anchor: Date): HistoryPeriodSummary {
  const dateKeys = getDaysInWeek(anchor);
  return aggregatePeriodSummary(
    "week",
    formatWeekRangeLabel(anchor),
    dateKeys[0]!,
    dateKeys[dateKeys.length - 1]!,
    dateKeys,
    state.days,
  );
}

export function aggregateHistoryForMonth(state: GuestState, anchor: Date): HistoryPeriodSummary {
  const dateKeys = getDaysInMonth(anchor);
  return aggregatePeriodSummary(
    "month",
    formatMonthLabel(anchor),
    dateKeys[0]!,
    dateKeys[dateKeys.length - 1]!,
    dateKeys,
    state.days,
  );
}

export function aggregateHistoryForYearPeriod(state: GuestState, year: number): HistoryPeriodSummary {
  const dateKeys = getMonthsInYear(year).flatMap((monthDate) => getDaysInMonth(monthDate));
  return aggregatePeriodSummary(
    "year",
    String(year),
    `${year}-01-01`,
    `${year}-12-31`,
    dateKeys,
    state.days,
  );
}

export function aggregateHistoryForYear(state: GuestState, year: number): HistoryYearSummary {
  const months = getMonthsInYear(year).map((monthDate, index) => {
    const monthSummary = aggregateHistoryForMonth(state, monthDate);
    const previous =
      index > 0 ? aggregateHistoryForMonth(state, getMonthsInYear(year)[index - 1]!) : undefined;
    const trend =
      !previous || monthSummary.trackedDayCount === 0 || previous.trackedDayCount === 0
        ? "flat"
        : monthSummary.totalCreatedKg > previous.totalCreatedKg
          ? "up"
          : monthSummary.totalCreatedKg < previous.totalCreatedKg
            ? "down"
            : "flat";

    return {
      monthIndex: index,
      monthLabel: monthDate.toLocaleDateString("en-US", { month: "long" }),
      totalKg: monthSummary.totalCreatedKg,
      trackedDays: monthSummary.trackedDayCount,
      topCategoryLabel: monthSummary.categoryBreakdown[0]?.label ?? "No data",
      greenImpactKg: monthSummary.greenImpactKg,
      averageDailyKg:
        monthSummary.trackedDayCount > 0
          ? Math.round((monthSummary.totalCreatedKg / monthSummary.trackedDayCount) * 10) / 10
          : 0,
      trend,
    } satisfies HistoryMonthSummary;
  });

  const trackedMonths = months.filter((month) => month.trackedDays > 0);
  const yearlyTotalKg = Math.round(months.reduce((sum, month) => sum + month.totalKg, 0) * 10) / 10;
  const yearlyGreenImpactKg = Math.round(
    getMonthsInYear(year).reduce(
      (sum, monthDate) => sum + aggregateHistoryForMonth(state, monthDate).greenImpactKg,
      0,
    ) * 10,
  ) / 10;
  const trackedDayCount = months.reduce((sum, month) => sum + month.trackedDays, 0);

  const bestMonth = [...trackedMonths].sort((a, b) => a.totalKg - b.totalKg)[0];
  const highestMonth = [...trackedMonths].sort((a, b) => b.totalKg - a.totalKg)[0];
  const mostConsistentMonth = [...trackedMonths].sort(
    (a, b) => b.trackedDays - a.trackedDays || a.totalKg - b.totalKg,
  )[0];

  return {
    year,
    months,
    yearlyTotalKg,
    yearlyAverageDailyKg:
      trackedDayCount > 0 ? Math.round((yearlyTotalKg / trackedDayCount) * 10) / 10 : 0,
    yearlyGreenImpactKg,
    trackedDayCount,
    bestMonth,
    highestMonth,
    mostConsistentMonth,
  };
}

export function hasAnyHistory(state: GuestState): boolean {
  return Object.values(state.days).some((day) => meaningfulActivities(day).length > 0);
}

export function intensityStyles(intensity: FootprintIntensity): {
  background: string;
  border: string;
  label: string;
} {
  switch (intensity) {
    case "low":
      return { background: "linear-gradient(145deg, #e8f5ec, #f7fbf8)", border: "#c8e0c4", label: "Low footprint" };
    case "medium":
      return { background: "linear-gradient(145deg, #fff6df, #fffaf0)", border: "#ecd39a", label: "Moderate footprint" };
    case "high":
      return { background: "linear-gradient(145deg, #fff0e8, #fff7f2)", border: "#efc4aa", label: "High footprint" };
    case "incomplete":
      return { background: "linear-gradient(145deg, #f3f3f3, #fafafa)", border: "#d8d8d8", label: "Incomplete trail" };
    default:
      return { background: "rgba(255,255,255,0.55)", border: "#e4ede8", label: "No data" };
  }
}

export function dominantCategoryLabelFromDay(day: ActivityDay | undefined): string {
  if (!day) return "No data";
  return getDominantCategory(day).label;
}

export function categoryLabelForActivity(activity: ActivityEntry): string {
  if (activity.primaryCategory) return PRIMARY_CATEGORY_LABELS[activity.primaryCategory];
  return getActivityPrimaryCategoryLabel(activity);
}
