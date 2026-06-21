import { StatusBadge } from "@/components/cards/StatusBadge";
import {
  formatActivityTypeLine,
  getActivityPrimaryCategoryLabel,
  getActivityEmoji,
  getWhyItMatters,
} from "@/features/today/todayHelpers";
import type { ActivityEntry } from "@/types";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

function ImpactPill({ score }: { score: number }) {
  const tone = score >= 7 ? P.amber : score >= 5 ? "#D4A017" : P.green;
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: `${tone}18`, color: tone }}
    >
      Impact {score}/10
    </span>
  );
}

function CategoryScorePill({ activity }: { activity: ActivityEntry }) {
  if (typeof activity.categoryScore !== "number") return null;
  const tone = activity.categoryScore >= 9 ? P.amber : activity.categoryScore >= 6 ? "#D4A017" : P.green;
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: `${tone}18`, color: tone }}
      title={`${getActivityPrimaryCategoryLabel(activity)} · ${activity.scoreMeaning ?? "scored"}`}
    >
      {getActivityPrimaryCategoryLabel(activity)} {activity.categoryScore}/10
    </span>
  );
}

type ActivityCardProps = {
  activity: ActivityEntry;
  onConfirm?: (activityId: string) => void;
  onEdit?: (activityId: string) => void;
};

export function ActivityCard({ activity, onConfirm, onEdit }: ActivityCardProps) {
  const faded = activity.status === "estimated_from_profile";
  const assumed = activity.status === "assumed";
  const emoji = getActivityEmoji(activity);
  const typeLine = formatActivityTypeLine(activity);
  const why = getWhyItMatters(activity);
  const showActions = faded || assumed;

  return (
    <article
      className="rounded-2xl border p-4 transition-all hover:shadow-sm"
      style={{
        background: faded ? "rgba(253,250,244,0.55)" : P.card,
        borderColor: faded ? "#D4C8B8" : assumed ? `${P.amber}55` : P.border,
        borderStyle: faded ? "dashed" : "solid",
        opacity: faded ? 0.88 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ background: "#EEF5EE" }}
          aria-hidden="true"
        >
          {emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
              {activity.label}
            </h3>
            <StatusBadge status={activity.status} />
          </div>

          <p className="mt-0.5 text-xs" style={{ color: P.faintText }}>
            {typeLine}
          </p>

          {faded ? (
            <p className="mt-1 text-[11px] font-medium" style={{ color: P.amber }}>
              Estimated from Carbon Memory
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryScorePill activity={activity} />
            <ImpactPill score={activity.estimates.impactScore} />
            <span className="text-xs font-semibold" style={{ color: P.charcoal }}>
              {activity.estimates.co2eKg.toFixed(1)} kg CO₂
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed" style={{ color: P.mutedText }}>
            <span className="font-medium" style={{ color: P.charcoal }}>
              Why this matters:{" "}
            </span>
            {why}
          </p>

          {showActions && (onConfirm || onEdit) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onConfirm && faded ? (
                <button
                  type="button"
                  onClick={() => onConfirm(activity.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: P.green, outlineColor: P.green }}
                >
                  Confirm
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(activity.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ borderColor: P.border, color: P.charcoal, outlineColor: P.green }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
