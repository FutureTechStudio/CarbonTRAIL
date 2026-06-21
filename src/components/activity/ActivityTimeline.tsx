import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ActivityCard } from "@/components/activity/ActivityCard";
import type { ActivityEntry } from "@/types";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type ActivityTimelineProps = {
  activities: ActivityEntry[];
  title?: string;
  defaultExpanded?: boolean;
  onConfirmActivity?: (activityId: string) => void;
  onEditActivity?: (activityId: string) => void;
};

export function ActivityTimeline({
  activities,
  title = "Today's Activities",
  defaultExpanded = false,
  onConfirmActivity,
  onEditActivity,
}: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section
      className="rounded-[1.35rem] border p-4 sm:p-5"
      style={{ background: "rgba(253,250,244,0.88)", borderColor: P.border }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold sm:text-lg" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
            {title}
          </h2>
          {!expanded ? (
            <p className="mt-0.5 text-xs" style={{ color: P.mutedText }}>
              {activities.length === 0
                ? "No activities logged yet"
                : `${activities.length} activit${activities.length === 1 ? "y" : "ies"} logged`}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: P.green, outlineColor: P.green }}
        >
          {expanded ? "Collapse" : "Open"}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: P.border, color: P.mutedText }}>
              No activities logged yet.
            </p>
          ) : (
            activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex w-5 justify-center pt-5">
                  <div
                    className="min-h-[calc(100%+12px)] w-0.5 flex-1"
                    style={{ background: index === activities.length - 1 ? "transparent" : P.border }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <ActivityCard
                    activity={activity}
                    onConfirm={onConfirmActivity}
                    onEdit={onEditActivity}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
