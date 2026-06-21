import type { ActivityDay } from "@/types";
import type { CheckpointSlotId } from "@/ai/pandaSchemas";
import { CHECKPOINT_SLOTS } from "@/ai/pandaSchemas";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type CheckinDayTrackProps = {
  date: string;
  day?: ActivityDay;
  checkpointStatuses: Partial<
    Record<CheckpointSlotId, "confirmed" | "assumed" | "predicted" | "estimated" | "missing">
  >;
};

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function statusTone(
  status: "confirmed" | "assumed" | "predicted" | "estimated" | "missing" | undefined,
): { label: string; color: string; bg: string } {
  if (status === "confirmed") return { label: "Confirmed", color: P.green, bg: "rgba(47,93,70,0.12)" };
  if (status === "assumed") return { label: "Assumed", color: "#7A6A2E", bg: "rgba(180,150,60,0.14)" };
  if (status === "predicted") return { label: "Predicted", color: "#5C6B8A", bg: "rgba(92,107,138,0.12)" };
  if (status === "estimated") return { label: "Estimated", color: P.mutedText, bg: "rgba(0,0,0,0.04)" };
  return { label: "Missing", color: P.faintText, bg: "rgba(0,0,0,0.03)" };
}

export function CheckinDayTrack({ date, day, checkpointStatuses }: CheckinDayTrackProps) {
  const loggedCount = day?.activities.filter((a) => a.status !== "estimated_from_profile").length ?? 0;

  return (
    <aside className="space-y-3">
      <div className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
          Today&apos;s trail
        </p>
        <p className="mt-1 text-lg font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          {formatDateLabel(date)}
        </p>
        <p className="mt-1 text-sm" style={{ color: P.mutedText }}>
          {loggedCount} logged · {Math.round((day?.totals.confidence ?? 0.1) * 100)}% confidence
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: P.mutedText }}>
          Each day keeps its own carbon trail. Panda saves what you tell it, or fills gaps from your patterns and Carbon
          Memory.
        </p>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
        <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Day checkpoints
        </p>
        <ul className="mt-3 space-y-2">
          {CHECKPOINT_SLOTS.filter((slot) => slot.id !== "day_summary").map((slot) => {
            const status = checkpointStatuses[slot.id] ?? "missing";
            const tone = statusTone(status);
            return (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs"
                style={{ background: tone.bg }}
              >
                <span style={{ color: P.charcoal }}>{slot.label}</span>
                <span className="font-semibold" style={{ color: tone.color }}>
                  {tone.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {day && day.activities.length > 0 ? (
        <div className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
          <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
            Logged today
          </p>
          <ul className="mt-3 space-y-2 text-xs" style={{ color: P.mutedText }}>
            {day.activities
              .filter((activity) => activity.status !== "estimated_from_profile")
              .map((activity) => (
                <li key={activity.id} className="rounded-lg border px-3 py-2" style={{ borderColor: P.border }}>
                  <p className="font-medium" style={{ color: P.charcoal }}>
                    {activity.label}
                  </p>
                  <p>
                    {activity.category} · {activity.status.replaceAll("_", " ")}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
