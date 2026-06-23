import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { analyzeHistoryPeriod } from "@/ai/historyPandaAnalysis";
import { useGuest } from "@/app/providers";
import { DailyTrailView } from "@/features/today/DailyTrailView";
import { formatViewDateLabel, parseOptionalDateSearchParam } from "@/features/today/todayDateView";
import {
  aggregateHistoryForMonth,
  aggregateHistoryForWeek,
  aggregateHistoryForYear,
  aggregateHistoryForYearPeriod,
  formatMonthLabel,
  formatWeekRangeLabel,
  hasAnyHistory,
  intensityStyles,
  parseDateKey,
  type HistoryDaySnapshot,
  type HistoryPeriodSummary,
  type HistoryView,
} from "@/features/history/historyModel";
import {
  buildHistoryInsights,
  buildYearInsights,
} from "@/features/history/historyInsights";
import { getDailyFootprintLevel } from "@/logic/dailyFootprintLevel";
import { P, PAGE_SHELL } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";
const HISTORY_PAGE_SHELL =
  `${PAGE_SHELL} min-w-0 space-y-4 px-4 pb-24 pt-4 lg:px-6 lg:pb-8`;
const DASHBOARD_GRID =
  "grid w-full min-w-0 max-w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)] xl:items-stretch";
const HISTORY_PAGE_FRAME = "relative min-h-full w-full min-w-0 max-w-full overflow-x-hidden";

type PandaAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; insights: string[]; source: "ai" | "local" }
  | { status: "error"; message: string };

function footprintImpactLabel(totalKg: number): string {
  return getDailyFootprintLevel(totalKg).label;
}

function averageDailyImpactLabel(summary: HistoryPeriodSummary): string {
  if (summary.trackedDayCount === 0) return "—";
  const averageKg = summary.totalCreatedKg / summary.trackedDayCount;
  return footprintImpactLabel(averageKg);
}

function shiftAnchor(view: HistoryView, anchor: Date, direction: -1 | 1): Date {
  const next = new Date(anchor);
  if (view === "week") {
    next.setDate(next.getDate() + direction * 7);
  } else if (view === "month") {
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setFullYear(next.getFullYear() + direction);
  }
  return next;
}

function rangeLabelForView(view: HistoryView, anchor: Date): string {
  if (view === "week") return formatWeekRangeLabel(anchor);
  if (view === "month") return formatMonthLabel(anchor);
  return String(anchor.getFullYear());
}

function SummaryCard({
  title,
  value,
  helper,
  icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone?: "neutral" | "green" | "sky" | "amber";
}) {
  const tones = {
    neutral: { bg: P.card, border: P.border },
    green: { bg: `${P.green}10`, border: `${P.green}28` },
    sky: { bg: `${P.sky}14`, border: `${P.sky}33` },
    amber: { bg: `${P.amber}12`, border: `${P.amber}33` },
  }[tone];

  return (
    <article
      className="flex h-full w-full min-h-[108px] min-w-0 flex-col rounded-[1.25rem] border p-3.5 sm:min-h-[118px] sm:p-4"
      style={{ background: tones.bg, borderColor: tones.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide sm:text-xs" style={{ color: P.faintText }}>
          {title}
        </p>
        <span className="shrink-0 text-base" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p
        className="flex flex-1 items-center break-words py-1 text-base font-extrabold leading-tight sm:text-lg lg:text-xl"
        style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}
      >
        {value}
      </p>
      <p className="text-[10px] leading-snug sm:text-[11px]" style={{ color: P.mutedText }}>
        {helper}
      </p>
    </article>
  );
}

function ViewSwitcher({ view, onChange }: { view: HistoryView; onChange: (view: HistoryView) => void }) {
  const options: Array<{ id: HistoryView; label: string }> = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ];

  return (
    <div
      className="flex w-full min-w-0 rounded-full border p-1 lg:inline-flex lg:w-auto"
      style={{ background: "rgba(255,255,255,0.55)", borderColor: P.border }}
      role="group"
      aria-label="History view"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={view === option.id}
          onClick={() => onChange(option.id)}
          className="flex-1 rounded-full px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-4 sm:py-1.5 lg:flex-none"
          style={{
            background: view === option.id ? P.green : "transparent",
            color: view === option.id ? "#fff" : P.mutedText,
            outlineColor: P.green,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DateNavigation({
  view,
  anchor,
  onPrevious,
  onNext,
}: {
  view: HistoryView;
  anchor: Date;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const label = rangeLabelForView(view, anchor);
  const prevLabel =
    view === "week" ? "Previous week" : view === "month" ? "Previous month" : "Previous year";
  const nextLabel = view === "week" ? "Next week" : view === "month" ? "Next month" : "Next year";

  return (
    <div
      className="flex w-full min-w-0 items-center gap-2 rounded-[1.25rem] border px-3 py-2 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5"
      style={{ borderColor: P.border, background: P.card }}
      aria-label="History period navigation"
    >
      <button
        type="button"
        onClick={onPrevious}
        aria-label={prevLabel}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-2"
        style={{ color: P.charcoal, outlineColor: P.green }}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span className="hidden sm:inline">{prevLabel.replace("Previous ", "← Previous ")}</span>
        <span className="sm:hidden">Prev</span>
      </button>
      <p
        className="min-w-0 flex-1 truncate px-1 text-center text-xs font-bold sm:px-0 sm:text-sm"
        style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}
      >
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        aria-label={nextLabel}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:justify-self-end sm:px-2"
        style={{ color: P.charcoal, outlineColor: P.green }}
      >
        <span className="hidden sm:inline">{nextLabel.replace("Next ", "Next ")} →</span>
        <span className="sm:hidden">Next</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function WeekDayCard({
  snapshot,
  onSelect,
  isToday = false,
}: {
  snapshot: HistoryDaySnapshot;
  onSelect: (snapshot: HistoryDaySnapshot) => void;
  isToday?: boolean;
}) {
  const date = parseDateKey(snapshot.date);
  const styles = intensityStyles(snapshot.intensity);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dayNumber = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const hasData = snapshot.tracked;

  return (
    <button
      type="button"
      onClick={() => onSelect(snapshot)}
      className="min-w-[8.5rem] shrink-0 snap-start rounded-[1.15rem] border p-3 text-left transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 xl:min-w-0 xl:w-full"
      style={{
        background: styles.background,
        borderColor: isToday ? P.green : hasData ? `${P.green}55` : styles.border,
        borderStyle: snapshot.intensity === "incomplete" ? "dashed" : "solid",
        borderWidth: isToday ? 2 : hasData ? 1.5 : 1,
        outlineColor: P.green,
        boxShadow: isToday ? `0 0 0 2px ${P.green}22` : hasData ? `inset 0 0 0 1px ${P.green}18` : undefined,
        opacity: hasData ? 1 : 0.88,
      }}
      aria-label={`${dayName} ${dayNumber}, ${snapshot.tracked ? `${snapshot.totalKg.toFixed(1)} kg CO₂, Impact ${footprintImpactLabel(snapshot.totalKg)}` : "no data"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
        {dayName}
      </p>
      <p className="text-[10px]" style={{ color: P.mutedText }}>
        {dayNumber}
      </p>
      {snapshot.tracked ? (
        <>
          <p className="mt-2 text-base font-bold" style={{ color: P.charcoal }}>
            {snapshot.totalKg.toFixed(1)} kg CO₂
          </p>
          <p className="mt-1 text-[11px]" style={{ color: P.mutedText }}>
            Impact: {footprintImpactLabel(snapshot.totalKg)}
          </p>
          <p className="text-[11px]" style={{ color: P.mutedText }}>
            {snapshot.completeness}% complete
          </p>
          <p className="mt-1 text-[11px] font-medium" style={{ color: P.charcoal }}>
            Biggest: {snapshot.dominantCategoryLabel}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs" style={{ color: P.faintText }}>
          No trail yet
        </p>
      )}
      <p className="sr-only">{styles.label}</p>
    </button>
  );
}

function WeekDayCards({
  snapshots,
  todayDate,
  onSelect,
}: {
  snapshots: HistoryDaySnapshot[];
  todayDate: string;
  onSelect: (snapshot: HistoryDaySnapshot) => void;
}) {
  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden" aria-label="Weekly day selector">
      <div className="-mx-1 flex w-0 min-w-full gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 xl:grid xl:w-full xl:min-w-0 xl:grid-cols-7 xl:overflow-visible xl:px-0">
        {snapshots.map((snapshot) => (
          <WeekDayCard
            key={snapshot.date}
            snapshot={snapshot}
            onSelect={onSelect}
            isToday={snapshot.date === todayDate}
          />
        ))}
      </div>
    </section>
  );
}

function buildSparseWeekChartMessage(summary: HistoryPeriodSummary): string | null {
  const tracked = summary.daySnapshots.filter((snapshot) => snapshot.tracked);
  if (tracked.length === 0 || tracked.length >= summary.daySnapshots.length) return null;

  const dayNames = tracked.map((snapshot) =>
    parseDateKey(snapshot.date).toLocaleDateString("en-US", { weekday: "long" }),
  );

  if (dayNames.length === 1) {
    return `Only ${dayNames[0]} has logged trail data this week. Add more days to reveal your weekly pattern.`;
  }

  const last = dayNames[dayNames.length - 1];
  const rest = dayNames.slice(0, -1).join(", ");
  return `Only ${rest} and ${last} have logged trail data this week. Add more days to reveal your weekly pattern.`;
}

function WeekTrendChart({ summary }: { summary: HistoryPeriodSummary }) {
  const tracked = summary.daySnapshots.filter((snapshot) => snapshot.tracked);
  if (tracked.length === 0) return null;

  const sparseMessage = buildSparseWeekChartMessage(summary);
  const maxKg = Math.max(...tracked.map((snapshot) => snapshot.totalKg), 1);
  const width = 320;
  const height = 120;
  const pointCoords = summary.daySnapshots.map((snapshot, index) => {
    const x = (index / Math.max(summary.daySnapshots.length - 1, 1)) * width;
    const y = height - (snapshot.totalKg / maxKg) * (height - 16) - 8;
    return { x, y, snapshot };
  });
  const points = pointCoords.map(({ x, y }) => `${x},${y}`);
  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <div
      className="flex w-full min-w-0 flex-col rounded-[1.25rem] border p-4 xl:h-full xl:min-h-[340px]"
      style={{ borderColor: P.border, background: P.card }}
    >
      <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        Weekly trail
      </p>
      <p className="mt-0.5 text-[11px]" style={{ color: P.mutedText }}>
        Daily CO₂ across the week
      </p>
      {sparseMessage ? (
        <p className="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed" style={{ color: P.mutedText, background: `${P.sage}88` }}>
          {sparseMessage}
        </p>
      ) : null}
      <div className="mt-4 min-h-[180px] w-full flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full min-h-[180px] w-full"
          role="img"
          aria-label="Weekly CO₂ trend"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="historyWeekFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`${P.green}55`} />
              <stop offset="100%" stopColor={`${P.green}05`} />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#historyWeekFill)" />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke={P.green}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pointCoords.map(({ x, y, snapshot }) =>
            snapshot.tracked ? (
              <circle
                key={snapshot.date}
                cx={x}
                cy={y}
                r={snapshot.totalKg === maxKg ? 5 : 4}
                fill={P.green}
                stroke="#fff"
                strokeWidth="1.5"
              />
            ) : null,
          )}
        </svg>
        <div className="mt-2 grid shrink-0 grid-cols-7 gap-1 text-center text-[10px]">
          {summary.daySnapshots.map((snapshot) => {
            const label = parseDateKey(snapshot.date).toLocaleDateString("en-US", { weekday: "short" });
            return (
              <span
                key={snapshot.date}
                className="truncate"
                style={{
                  color: snapshot.tracked ? P.charcoal : P.faintText,
                  fontWeight: snapshot.tracked ? 600 : 400,
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
      <div
        className="mt-auto flex flex-col gap-1 border-t pt-3 text-[10px] sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:text-[11px]"
        style={{ borderColor: P.border, color: P.mutedText }}
      >
        {summary.bestDay ? (
          <span>
            Best: {parseDateKey(summary.bestDay.date).toLocaleDateString("en-US", { weekday: "short" })} (
            {summary.bestDay.totalKg.toFixed(1)} kg)
          </span>
        ) : null}
        {summary.highestDay ? (
          <span>
            Highest: {parseDateKey(summary.highestDay.date).toLocaleDateString("en-US", { weekday: "short" })} (
            {summary.highestDay.totalKg.toFixed(1)} kg)
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MonthCalendar({ summary, onSelectDay }: { summary: HistoryPeriodSummary; onSelectDay: (snapshot: HistoryDaySnapshot) => void }) {
  const firstDay = parseDateKey(summary.periodStart);
  const leadingEmpty = (firstDay.getDay() + 6) % 7;

  return (
    <div className="w-full min-w-0 rounded-[1.25rem] border p-4" style={{ borderColor: P.border, background: P.card }}>
      <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        Monthly carbon map
      </p>
      <p className="mt-0.5 text-[11px]" style={{ color: P.mutedText }}>
        Each tile shows footprint intensity for that day
      </p>
      <div className="mt-4 grid min-w-0 grid-cols-7 gap-1 sm:gap-1.5 md:gap-2" role="grid" aria-label="Monthly calendar">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="truncate text-center text-[9px] font-semibold sm:text-[10px]" style={{ color: P.faintText }}>
            <span className="sm:hidden">{label.charAt(0)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
        {Array.from({ length: leadingEmpty }).map((_, index) => (
          <div key={`pad-${index}`} aria-hidden="true" />
        ))}
        {summary.daySnapshots.map((snapshot) => {
          const styles = intensityStyles(snapshot.intensity);
          const dayNum = parseDateKey(snapshot.date).getDate();
          const tooltip = snapshot.tracked
            ? `${parseDateKey(snapshot.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${snapshot.totalKg.toFixed(1)} kg CO₂ · Impact ${footprintImpactLabel(snapshot.totalKg)} · ${snapshot.dominantCategoryLabel} highest · ${snapshot.completeness}% complete`
            : `${parseDateKey(snapshot.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · no data`;

          return (
            <button
              key={snapshot.date}
              type="button"
              onClick={() => onSelectDay(snapshot)}
              title={tooltip}
              aria-label={tooltip}
              className="relative aspect-square rounded-xl border text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{
                background: styles.background,
                borderColor: styles.border,
                borderStyle: snapshot.intensity === "incomplete" ? "dashed" : "solid",
                color: P.charcoal,
                outlineColor: P.green,
              }}
            >
              {dayNum}
              {snapshot.tracked ? (
                <span
                  className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
                  style={{
                    background: snapshot.completeness >= 70 ? P.green : P.amber,
                  }}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthStatsRow({ summary }: { summary: HistoryPeriodSummary }) {
  const items = [
    summary.bestDay
      ? { label: "Best day", value: `${summary.bestDay.totalKg.toFixed(1)} kg`, helper: formatDayShort(summary.bestDay.date) }
      : null,
    summary.highestDay
      ? { label: "Highest footprint", value: `${summary.highestDay.totalKg.toFixed(1)} kg`, helper: formatDayShort(summary.highestDay.date) }
      : null,
    summary.mostImprovedDay && summary.mostImprovedDay.savedKg > 0
      ? { label: "Most improved", value: `${summary.mostImprovedDay.savedKg.toFixed(1)} kg saved`, helper: formatDayShort(summary.mostImprovedDay.date) }
      : null,
    { label: "Weekday avg", value: `${summary.weekdayAverageKg.toFixed(1)} kg`, helper: "Mon–Fri tracked days" },
    { label: "Weekend avg", value: `${summary.weekendAverageKg.toFixed(1)} kg`, helper: "Sat–Sun tracked days" },
  ].filter(Boolean) as Array<{ label: string; value: string; helper: string }>;

  return (
    <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border, background: "rgba(255,255,255,0.5)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
            {item.label}
          </p>
          <p className="mt-1 text-sm font-bold" style={{ color: P.charcoal }}>
            {item.value}
          </p>
          <p className="text-[10px]" style={{ color: P.mutedText }}>
            {item.helper}
          </p>
        </div>
      ))}
    </div>
  );
}

function YearMonthCard({ month }: { month: ReturnType<typeof aggregateHistoryForYear>["months"][number] }) {
  const trendIcon =
    month.trend === "up" ? (
      <TrendingUp size={14} style={{ color: P.amber }} aria-label="Trending up" />
    ) : month.trend === "down" ? (
      <TrendingDown size={14} style={{ color: P.green }} aria-label="Trending down" />
    ) : (
      <span className="text-xs" style={{ color: P.faintText }}>
        —
      </span>
    );

  return (
    <article
      className="rounded-[1.15rem] border p-3"
      style={{
        background: month.trackedDays > 0 ? "linear-gradient(145deg, #eef6f0, #fdfaf4)" : P.card,
        borderColor: P.border,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: P.charcoal }}>
          {month.monthLabel}
        </p>
        {trendIcon}
      </div>
      <p className="mt-2 text-lg font-extrabold" style={{ color: P.charcoal }}>
        {month.totalKg.toFixed(1)} kg CO₂
      </p>
      <p className="mt-1 text-[11px]" style={{ color: P.mutedText }}>
        {month.trackedDays} days tracked
      </p>
      <p className="text-[11px]" style={{ color: P.mutedText }}>
        Top: {month.topCategoryLabel}
      </p>
      <p className="text-[11px] font-medium" style={{ color: P.green }}>
        {month.greenImpactKg.toFixed(1)} kg saved
      </p>
    </article>
  );
}

function CategoryBreakdownCard({ summary }: { summary: HistoryPeriodSummary }) {
  return (
    <article className="w-full min-w-0 rounded-[1.25rem] border p-4" style={{ borderColor: P.border, background: P.card }}>
      <h2 className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        Category Breakdown
      </h2>
      <p className="mt-0.5 text-[11px]" style={{ color: P.mutedText }}>
        Where your footprint came from this period
      </p>
      {summary.categoryBreakdown.length === 0 ? (
        <p className="mt-4 text-xs" style={{ color: P.mutedText }}>
          No category data for this period yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {summary.categoryBreakdown.map((row) => (
            <li key={row.id}>
              <div className="flex items-start justify-between gap-2 text-xs">
                <span className="min-w-0 font-semibold" style={{ color: P.charcoal }}>
                  <span aria-hidden="true">{row.icon} </span>
                  {row.label}
                </span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: P.mutedText }}>
                  {row.totalKg.toFixed(1)} kg · {row.percent}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: P.sage }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(row.percent, 4)}%`, background: `linear-gradient(90deg, ${P.leaf}, ${P.green})` }}
                />
              </div>
              <p className="mt-0.5 text-[10px]" style={{ color: P.faintText }}>
                Avg score {row.averageScore}/10
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function PandaInsightsCard({
  insights,
  pandaAnalysis,
  onAskPanda,
}: {
  insights: Array<{ id: string; text: string }>;
  pandaAnalysis: PandaAnalysisState;
  onAskPanda: () => void;
}) {
  const displayedInsights =
    pandaAnalysis.status === "ready"
      ? pandaAnalysis.insights.map((text, index) => ({ id: `panda-${index}`, text }))
      : insights;
  const loading = pandaAnalysis.status === "loading";

  return (
    <article
      className="w-full min-w-0 rounded-[1.25rem] border p-4"
      style={{
        background: "linear-gradient(145deg, rgba(228,239,231,0.92), rgba(253,250,244,0.94))",
        borderColor: `${P.green}22`,
      }}
    >
      <h2 className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        🐼 Panda Insights
      </h2>
      {pandaAnalysis.status === "ready" ? (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: P.green }}>
          {pandaAnalysis.source === "ai" ? "Panda analysis" : "Panda summary (offline)"}
        </p>
      ) : null}
      <ul className="mt-4 space-y-2.5">
        {displayedInsights.map((insight) => (
          <li key={insight.id} className="text-xs leading-relaxed" style={{ color: P.mutedText }}>
            {insight.text}
          </li>
        ))}
      </ul>
      {pandaAnalysis.status === "error" ? (
        <p className="mt-3 text-xs" style={{ color: "#9a3412" }}>
          {pandaAnalysis.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onAskPanda}
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
        style={{ background: "rgba(253,250,244,0.85)", borderColor: `${P.green}30`, color: P.charcoal, outlineColor: P.green }}
      >
        <Sparkles size={14} style={{ color: P.green }} aria-hidden="true" />
        {loading
          ? "Panda is reviewing this period..."
          : pandaAnalysis.status === "ready"
            ? "Refresh Panda analysis"
            : "Ask Panda about this period"}
      </button>
    </article>
  );
}

function HistorySidebar({
  summary,
  insights,
  pandaAnalysis,
  onAskPanda,
}: {
  summary: HistoryPeriodSummary;
  insights: Array<{ id: string; text: string }>;
  pandaAnalysis: PandaAnalysisState;
  onAskPanda: () => void;
}) {
  return (
    <aside className="flex w-full min-w-0 flex-col gap-4">
      <CategoryBreakdownCard summary={summary} />
      <PandaInsightsCard insights={insights} pandaAnalysis={pandaAnalysis} onAskPanda={onAskPanda} />
    </aside>
  );
}

function HistoryEmptyState() {
  return (
    <div
      className="rounded-[1.5rem] border px-6 py-10 text-center"
      style={{ borderColor: P.border, background: P.card }}
    >
      <p className="text-3xl" aria-hidden="true">
        🌱
      </p>
      <h2 className="mt-3 text-lg font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        Your carbon history is just getting started
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: P.mutedText }}>
        Complete a few daily trails and Panda will show your weekly and monthly patterns here.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/today"
          className="rounded-full px-4 py-2.5 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: P.green, outlineColor: P.green }}
        >
          Go to Today
        </Link>
        <Link
          to="/today"
          className="rounded-full border px-4 py-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: P.border, color: P.charcoal, outlineColor: P.green }}
        >
          Fill today with Panda
        </Link>
      </div>
    </div>
  );
}

function HistoryDayBanner({ date, onBack }: { date: string; onBack: () => void }) {
  return (
    <div
      className="mb-4 flex min-w-0 flex-col gap-3 rounded-[1.15rem] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: P.border, background: "rgba(255,255,255,0.72)" }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
          Carbon History
        </p>
        <p className="truncate text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          {formatViewDateLabel(date)}
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: P.border, color: P.charcoal }}
        >
          Back to overview
        </button>
        <Link
          to="/today"
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: P.green }}
        >
          Go to Today
        </Link>
      </div>
    </div>
  );
}

function formatDayShort(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function HistoryPage() {
  const { state, todayDate } = useGuest();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = parseOptionalDateSearchParam(searchParams.get("date"));
  const [view, setView] = useState<HistoryView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [pandaAnalysis, setPandaAnalysis] = useState<PandaAnalysisState>({ status: "idle" });

  const hasHistory = useMemo(() => hasAnyHistory(state), [state]);

  const periodSummary = useMemo(() => {
    if (view === "week") return aggregateHistoryForWeek(state, anchor);
    if (view === "month") return aggregateHistoryForMonth(state, anchor);
    return aggregateHistoryForYearPeriod(state, anchor.getFullYear());
  }, [anchor, state, view]);

  const yearSummary = useMemo(
    () => (view === "year" ? aggregateHistoryForYear(state, anchor.getFullYear()) : null),
    [anchor, state, view],
  );

  const insights = useMemo(() => {
    if (view === "year" && yearSummary) return buildYearInsights(yearSummary);
    return buildHistoryInsights(periodSummary, view);
  }, [periodSummary, view, yearSummary]);

  useEffect(() => {
    setPandaAnalysis({ status: "idle" });
  }, [view, periodSummary.periodStart, periodSummary.periodEnd]);

  const handleAskPanda = useCallback(async () => {
    if (!state.profile) return;
    setPandaAnalysis({ status: "loading" });
    try {
      const result = await analyzeHistoryPeriod({
        summary: periodSummary,
        view,
        profile: state.profile,
        yearSummary,
      });
      setPandaAnalysis({ status: "ready", insights: result.insights, source: result.source });
    } catch (error) {
      setPandaAnalysis({
        status: "error",
        message: error instanceof Error ? error.message : "Panda could not analyze this period.",
      });
    }
  }, [periodSummary, state.profile, view, yearSummary]);

  const handleSelectDay = (snapshot: HistoryDaySnapshot) => {
    setSearchParams({ date: snapshot.date });
  };

  if (selectedDate) {
    return (
      <DailyTrailView
        viewDate={selectedDate}
        onDateChange={(date) => setSearchParams({ date })}
        headerBanner={
          <HistoryDayBanner date={selectedDate} onBack={() => setSearchParams({})} />
        }
      />
    );
  }

  if (!hasHistory) {
    return (
      <div className={HISTORY_PAGE_FRAME}>
        <div className={HISTORY_PAGE_SHELL}>
          <HistoryHeader view={view} onViewChange={setView} />
          <HistoryEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className={HISTORY_PAGE_FRAME}>
      <div className={HISTORY_PAGE_SHELL}>
      <HistoryHeader view={view} onViewChange={setView} />

      <DateNavigation
        view={view}
        anchor={anchor}
        onPrevious={() => setAnchor((current) => shiftAnchor(view, current, -1))}
        onNext={() => setAnchor((current) => shiftAnchor(view, current, 1))}
      />

      <section className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Period summary metrics">
        <SummaryCard
          title="Total Created"
          value={`${periodSummary.totalCreatedKg.toFixed(1)} kg CO₂`}
          helper="Across selected period"
          icon="🌍"
          tone="neutral"
        />
        <SummaryCard
          title="Green Impact"
          value={`${Math.abs(periodSummary.greenImpactKg).toFixed(1)} kg ${periodSummary.greenImpactKg >= 0 ? "saved" : "above usual"}`}
          helper="Compared with your usual pattern"
          icon={<Leaf size={18} style={{ color: P.green }} />}
          tone="green"
        />
        <SummaryCard
          title="Average Daily Impact"
          value={averageDailyImpactLabel(periodSummary)}
          helper="Based on daily CO₂ totals"
          icon="📊"
          tone="sky"
        />
        <SummaryCard
          title="Data Completeness"
          value={`${periodSummary.averageCompleteness}%`}
          helper="Based on confirmed and predicted trail data"
          icon="✓"
          tone="amber"
        />
      </section>

      {view === "week" ? (
        <>
          <WeekDayCards snapshots={periodSummary.daySnapshots} todayDate={todayDate} onSelect={handleSelectDay} />
          <div className={DASHBOARD_GRID}>
            <div className="order-1 w-full min-w-0 xl:col-start-2 xl:row-start-1">
              <HistorySidebar
                summary={periodSummary}
                insights={insights}
                pandaAnalysis={pandaAnalysis}
                onAskPanda={handleAskPanda}
              />
            </div>
            <div className="order-2 w-full min-w-0 xl:col-start-1 xl:row-start-1">
              <WeekTrendChart summary={periodSummary} />
            </div>
          </div>
        </>
      ) : null}

      {view === "month" ? (
        <>
          <section className="w-full min-w-0" aria-label="Monthly history">
            <MonthCalendar summary={periodSummary} onSelectDay={handleSelectDay} />
          </section>
          <div className={DASHBOARD_GRID}>
            <div className="order-1 w-full min-w-0 xl:col-start-2 xl:row-start-1">
              <HistorySidebar
                summary={periodSummary}
                insights={insights}
                pandaAnalysis={pandaAnalysis}
                onAskPanda={handleAskPanda}
              />
            </div>
            <div className="order-2 w-full min-w-0 xl:col-start-1 xl:row-start-1">
              <MonthStatsRow summary={periodSummary} />
            </div>
          </div>
        </>
      ) : null}

      {view === "year" && yearSummary ? (
        <>
          <section className="w-full min-w-0 space-y-4" aria-label="Yearly history">
            <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {yearSummary.months.map((month) => (
                <YearMonthCard key={month.monthIndex} month={month} />
              ))}
            </div>
          </section>
          <div className={DASHBOARD_GRID}>
            <div className="order-1 w-full min-w-0 xl:col-start-2 xl:row-start-1">
              <HistorySidebar
                summary={periodSummary}
                insights={insights}
                pandaAnalysis={pandaAnalysis}
                onAskPanda={handleAskPanda}
              />
            </div>
            <div className="order-2 w-full min-w-0 xl:col-start-1 xl:row-start-1">
              <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {yearSummary.bestMonth ? (
                  <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border }}>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: P.faintText }}>
                      Best month
                    </p>
                    <p className="text-sm font-bold">{yearSummary.bestMonth.monthLabel}</p>
                  </div>
                ) : null}
                {yearSummary.highestMonth ? (
                  <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border }}>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: P.faintText }}>
                      Highest month
                    </p>
                    <p className="text-sm font-bold">{yearSummary.highestMonth.monthLabel}</p>
                  </div>
                ) : null}
                {yearSummary.mostConsistentMonth ? (
                  <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border }}>
                    <p className="text-[11px] font-semibold uppercase" style={{ color: P.faintText }}>
                      Most consistent
                    </p>
                    <p className="text-sm font-bold">{yearSummary.mostConsistentMonth.monthLabel}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: P.faintText }}>
                    Yearly total
                  </p>
                  <p className="text-sm font-bold">{yearSummary.yearlyTotalKg.toFixed(1)} kg CO₂</p>
                </div>
                <div className="rounded-2xl border px-3 py-2.5" style={{ borderColor: P.border }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: P.faintText }}>
                    Yearly average / day
                  </p>
                  <p className="text-sm font-bold">{yearSummary.yearlyAverageDailyKg.toFixed(1)} kg CO₂</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      </div>
    </div>
  );
}

function HistoryHeader({ view, onViewChange }: { view: HistoryView; onViewChange: (view: HistoryView) => void }) {
  return (
    <header className="flex w-full min-w-0 flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="hidden min-w-0 flex-1 lg:block">
        <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Carbon History
        </h1>
        <p className="mt-1 text-sm" style={{ color: P.mutedText }}>
          See how your footprint changes across weeks, months, and years.
        </p>
        <p className="mt-2 text-xs italic" style={{ color: P.faintText }}>
          Panda turns your past days into patterns you can actually understand.
        </p>
      </div>
      <div className="min-w-0 w-full lg:w-auto lg:shrink-0">
        <ViewSwitcher view={view} onChange={onViewChange} />
      </div>
      <p className="text-sm leading-relaxed lg:hidden" style={{ color: P.mutedText }}>
        See how your footprint changes across weeks, months, and years.
      </p>
    </header>
  );
}
