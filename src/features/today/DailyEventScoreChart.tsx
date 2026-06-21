import type { ActivityEntry } from "@/types";
import { activityToTime, formatTimelineTime } from "@/features/today/trailTimeline";
import { P } from "@/theme/palette";

function eventScore(activity: ActivityEntry): number {
  return activity.estimates.impactScore;
}

function barColor(score: number): string {
  if (score >= 8) return "#A33F2E";
  if (score >= 6) return "#D97A36";
  if (score >= 4) return P.amber;
  if (score >= 2) return P.sky;
  return P.green;
}

const HOUR_LABELS = [
  { hour: 0, label: "0" },
  { hour: 6, label: "6" },
  { hour: 12, label: "12" },
  { hour: 18, label: "18" },
  { hour: 24, label: "24" },
];

export function DailyEventScoreChart({ activities }: { activities: ActivityEntry[] }) {
  const scoredActivities = activities
    .filter((activity) => activity.status !== "parsed_pending")
    .map((activity) => {
      const time = activityToTime(activity);
      const score = Math.max(0, Math.min(10, eventScore(activity)));
      const minutes = Math.max(0, Math.min(24 * 60, time.hour * 60 + time.minute));
      return {
        id: activity.id,
        score,
        time,
        leftPercent: (minutes / (24 * 60)) * 100,
      };
    });

  return (
    <div
      className="daily-ring-impact-chart"
      role="img"
      aria-label="Vertical bar chart showing event impact scores by hour from 0 to 24"
    >
      <div className="daily-ring-impact-chart__plot">
        <div className="daily-ring-impact-chart__grid" aria-hidden="true">
          {[0, 1, 2].map((line) => (
            <span key={line} className="daily-ring-impact-chart__hline" style={{ top: `${line * 50}%` }} />
          ))}
          {HOUR_LABELS.map((hour) => (
            <span
              key={hour.hour}
              className="daily-ring-impact-chart__vline"
              style={{ left: `${(hour.hour / 24) * 100}%` }}
            />
          ))}
        </div>

        <div className="daily-ring-impact-chart__bars">
          {scoredActivities.map((activity) => (
            <span
              key={activity.id}
              className="daily-ring-impact-chart__bar"
              style={{
                left: `${activity.leftPercent}%`,
                height: `${Math.max(6, activity.score * 10)}%`,
                background: barColor(activity.score),
              }}
              title={`${formatTimelineTime(activity.time.hour, activity.time.minute)} · Impact ${activity.score.toFixed(1)}/10`}
              aria-label={`${formatTimelineTime(activity.time.hour, activity.time.minute)} impact ${activity.score.toFixed(1)} out of 10`}
            />
          ))}
        </div>

        <div className="daily-ring-impact-chart__axis" aria-hidden="true">
          {HOUR_LABELS.map((hour) => (
            <span key={hour.hour}>{hour.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
